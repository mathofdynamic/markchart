/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  Connection,
  Edge as RFEdge,
  Node as RFNode,
  BackgroundVariant,
} from '@xyflow/react';

// Custom components
import TopBar from './components/TopBar';
import Sidebar from './components/Sidebar';
import OutputPanel from './components/OutputPanel';
import Toast from './components/Toast';
import NodeToolbar from './components/NodeToolbar';
import AIGenerateModal from './components/AIGenerateModal';
import SettingsModal from './components/SettingsModal';
import { CornersIn, CaretLeft, CaretRight } from '@phosphor-icons/react';

// Core domain logic
import { Flow, NodeType, Node as ModelNode, Edge as ModelEdge, GeneratedGraph } from './types';
import { validate } from './lib/validate';
import { toMarkdown, toMermaid } from './lib/exporter';
import { layoutGeneratedFlow } from './lib/layout';
import { useAuth } from './lib/auth';
import { fetchCloudFlows, saveCloudFlow, deleteCloudFlow } from './lib/api';

// Custom node and edge type registrations
import CustomNode from './components/CustomNode';
import CustomEdge from './components/CustomEdge';

const nodeTypes = {
  start: CustomNode,
  end: CustomNode,
  process: CustomNode,
  decision: CustomNode,
  loop: CustomNode,
  io: CustomNode,
  note: CustomNode,
};

const edgeTypes = {
  custom: CustomEdge,
};

function FlowEditor() {
  const [currentFlowId, setCurrentFlowId] = useState<string>('');
  const [title, setTitle] = useState<string>('Untitled Flow');
  const [description, setDescription] = useState<string>('');
  const [iconName, setIconName] = useState<string>('TreeStructure');
  const [nodes, setNodes, onNodesChange] = useNodesState<RFNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<RFEdge>([]);

  // Saved flows cache list
  const [savedFlows, setSavedFlows] = useState<Flow[]>([]);

  // Authenticated cloud flows
  const { user } = useAuth();
  const [cloudFlows, setCloudFlows] = useState<Flow[]>([]);
  const [savingCloud, setSavingCloud] = useState<boolean>(false);

  // Toast feedback state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'warning' } | null>(null);

  // Focus / Full-screen mode state
  const [isFocusMode, setIsFocusMode] = useState<boolean>(false);

  // AI generation modal state
  const [aiModalOpen, setAiModalOpen] = useState<boolean>(false);

  // Settings / API keys modal state
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);

  // Collapsible panel states
  const [leftCollapsed, setLeftCollapsed] = useState<boolean>(true);
  const [rightCollapsed, setRightCollapsed] = useState<boolean>(false);

  // Track the ID of the node currently being edited to temporarily push down lower workflow cards
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);

  // Trigger persistent feedback toasts
  const triggerToast = useCallback((message: string, type: 'success' | 'info' | 'warning' = 'info') => {
    setToast({ message, type });
  }, []);

  // Focus Mode toggle on Esc / F key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput = ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName) || (e.target as HTMLElement).isContentEditable;
      if (isInput) return;

      if (e.key === 'Escape') {
        if (isFocusMode) {
          setIsFocusMode(false);
          triggerToast('Exited focus mode', 'info');
        }
      } else if (e.key.toLowerCase() === 'f') {
        setIsFocusMode((prev) => {
          const next = !prev;
          triggerToast(next ? 'Entered focus mode' : 'Exited focus mode', 'info');
          return next;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFocusMode, triggerToast]);

  // App theme state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const cached = localStorage.getItem('markchart_theme');
    return cached === 'dark';
  });

  const { screenToFlowPosition } = useReactFlow();

  // 1. Initial mounting: Hydrate application from LocalStorage
  useEffect(() => {
    const cachedFlowsStr = localStorage.getItem('markchart_flows');
    let flowsList: Flow[] = [];

    if (cachedFlowsStr) {
      try {
        flowsList = JSON.parse(cachedFlowsStr);
      } catch (err) {
        console.error('Failed to parse cached flows:', err);
      }
    }

    if (flowsList.length > 0) {
      setSavedFlows(flowsList);
      // Load the first flow
      loadFlow(flowsList[0]);
    } else {
      // Create a fresh default empty flow
      const defaultId = `flow_${Date.now()}`;
      const firstFlow: Flow = {
        id: defaultId,
        title: 'Untitled Flow',
        description: 'Visual flow describing steps or decision pipelines',
        icon: 'TreeStructure',
        nodes: [],
        edges: [],
      };
      
      const newList = [firstFlow];
      localStorage.setItem('markchart_flows', JSON.stringify(newList));
      setSavedFlows(newList);
      loadFlow(firstFlow);
    }
  }, []);

  // Sync index theme classes
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('markchart_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('markchart_theme', 'light');
    }
  }, [darkMode]);

  // Load selected flow object details into active canvas
  const loadFlow = useCallback((flow: Flow) => {
    setCurrentFlowId(flow.id);
    setTitle(flow.title || 'Untitled Flow');
    setDescription(flow.description || '');
    setIconName(flow.icon || 'TreeStructure');

    const reconstitutedNodes: RFNode[] = (flow.nodes || []).map((node) => ({
      id: node.id,
      type: node.type,
      position: node.position,
      data: {
        label: node.label,
        description: node.description || '',
        type: node.type as NodeType,
      },
    }));

    const reconstitutedEdges: RFEdge[] = (flow.edges || []).map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: 'custom',
      data: {
        label: edge.label || '',
      },
    }));

    setNodes(reconstitutedNodes);
    setEdges(reconstitutedEdges);
  }, [setNodes, setEdges]);

  // 2. State-to-Model transformation mapping
  const currentFlowModel: Flow = useMemo(() => {
    return {
      id: currentFlowId,
      title,
      description,
      icon: iconName,
      nodes: nodes.map((node) => ({
        id: node.id,
        type: node.type as NodeType,
        label: (node.data?.label as string) || '',
        description: (node.data?.description as string) || '',
        position: node.position,
      })),
      edges: edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: (edge.data?.label as string) || undefined,
      })),
    };
  }, [currentFlowId, title, description, iconName, nodes, edges]);

  // Direct auto-save trigger on any active flow model shifts
  useEffect(() => {
    if (!currentFlowId) return;

    const storedStr = localStorage.getItem('markchart_flows');
    let flowsList: Flow[] = [];

    if (storedStr) {
      try {
        flowsList = JSON.parse(storedStr);
      } catch {
        // ignore
      }
    }

    const index = flowsList.findIndex((f) => f.id === currentFlowId);
    if (index >= 0) {
      // Overwrite current entry
      flowsList[index] = currentFlowModel;
    } else {
      flowsList.push(currentFlowModel);
    }

    localStorage.setItem('markchart_flows', JSON.stringify(flowsList));
    setSavedFlows(flowsList);
  }, [currentFlowModel, currentFlowId]);

  // Load cloud flows whenever the user signs in; clear them on sign-out.
  useEffect(() => {
    if (!user) {
      setCloudFlows([]);
      return;
    }
    fetchCloudFlows()
      .then(setCloudFlows)
      .catch((err) => console.error('Failed to load cloud flows:', err));
  }, [user]);

  // Save the active flow to the signed-in user's cloud account.
  const handleSaveToCloud = useCallback(async () => {
    if (!user) {
      triggerToast('Sign in with Google to save this flow to the cloud.', 'warning');
      return;
    }
    try {
      setSavingCloud(true);
      await saveCloudFlow(currentFlowModel);
      const list = await fetchCloudFlows();
      setCloudFlows(list);
      triggerToast('Saved to your cloud account!', 'success');
    } catch (err) {
      console.error(err);
      triggerToast('Could not save to cloud. Please try again.', 'warning');
    } finally {
      setSavingCloud(false);
    }
  }, [user, currentFlowModel, triggerToast]);

  // Load a cloud flow onto the canvas.
  const handleLoadCloudFlow = useCallback(
    (id: string) => {
      const flow = cloudFlows.find((f) => f.id === id);
      if (flow) {
        loadFlow(flow);
        triggerToast('Loaded flow from your cloud account.', 'info');
      }
    },
    [cloudFlows, loadFlow, triggerToast]
  );

  // Delete a cloud flow from the user's account.
  const handleDeleteCloudFlow = useCallback(
    async (id: string) => {
      try {
        await deleteCloudFlow(id);
        setCloudFlows((prev) => prev.filter((f) => f.id !== id));
        triggerToast('Removed flow from your cloud account.', 'info');
      } catch (err) {
        console.error(err);
        triggerToast('Could not delete the cloud flow.', 'warning');
      }
    },
    [triggerToast]
  );

  // Callback to propagate and write node label changes from CustomNode
  const handleNodeLabelChange = useCallback((id: string, newLabel: string) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: { ...node.data, label: newLabel },
          };
        }
        return node;
      })
    );
  }, [setNodes]);

  // Callback to propagate and write node description changes from CustomNode
  const handleNodeDescriptionChange = useCallback((id: string, newDesc: string) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: { ...node.data, description: newDesc },
          };
        }
        return node;
      })
    );
  }, [setNodes]);

  // Callback to propagate and write edge label alterations from CustomEdge
  const handleEdgeLabelChange = useCallback((id: string, newLabel: string) => {
    setEdges((eds) =>
      eds.map((edge) => {
        if (edge.id === id) {
          return {
            ...edge,
            data: { ...edge.data, label: newLabel },
          };
        }
        return edge;
      })
    );
  }, [setEdges]);

  // Handle active editing mode start to push below cards out of the way
  const handleNodeEditingStart = useCallback((id: string) => {
    setEditingNodeId(id);
  }, []);

  // Handle active editing mode completion or cancellation to drop cards back to position
  const handleNodeEditingEnd = useCallback(() => {
    setEditingNodeId(null);
  }, []);

  // Inline dynamic bindings of callbacks and coordinate shifting to ReactFlow structures
  const nodesWithCallbacks = useMemo(() => {
    // Find the current active editing node to retrieve its coordinates if any
    const editingNode = nodes.find((n) => n.id === editingNodeId);
    
    return nodes.map((node) => {
      let activePosition = node.position;

      // If another card is currently being edited, temporarily shift cards below it
      if (editingNode && node.id !== editingNodeId) {
        const xDiff = Math.abs(node.position.x - editingNode.position.x);
        const isBelowSameFlow = node.position.y > editingNode.position.y && xDiff < 250;

        if (isBelowSameFlow) {
          activePosition = {
            x: node.position.x,
            y: node.position.y + 160, // Shift downwards by 160px to clear space
          };
        }
      }

      return {
        ...node,
        position: activePosition,
        data: {
          ...node.data,
          type: node.type as NodeType,
          description: node.data?.description || '',
          onLabelChange: handleNodeLabelChange,
          onDescriptionChange: handleNodeDescriptionChange,
          onEditingStart: handleNodeEditingStart,
          onEditingEnd: handleNodeEditingEnd,
        },
      };
    });
  }, [nodes, editingNodeId, handleNodeLabelChange, handleNodeDescriptionChange, handleNodeEditingStart, handleNodeEditingEnd]);

  const edgesWithCallbacks = useMemo(() => {
    return edges.map((edge) => ({
      ...edge,
      type: 'custom',
      data: {
        ...edge.data,
        onLabelChange: handleEdgeLabelChange,
      },
    }));
  }, [edges, handleEdgeLabelChange]);

  // New flowchart canvas initialization
  const handleNewFlow = useCallback(() => {
    const newId = `flow_${Date.now()}`;
    const newFlow: Flow = {
      id: newId,
      title: 'Untitled Flow',
      description: '',
      icon: 'TreeStructure',
      nodes: [],
      edges: [],
    };

    const storedStr = localStorage.getItem('markchart_flows');
    let list: Flow[] = [];
    if (storedStr) {
      try {
        list = JSON.parse(storedStr);
      } catch {
        // ignore
      }
    }

    list.unshift(newFlow);
    localStorage.setItem('markchart_flows', JSON.stringify(list));
    setSavedFlows(list);

    // Swap active states
    loadFlow(newFlow);
    triggerToast('Created a brand-new flow space!', 'success');
  }, [loadFlow, triggerToast]);

  // Clear every node/edge from the current flow (autosave persists the empty state).
  const handleClearCanvas = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setEditingNodeId(null);
    triggerToast('Canvas cleared.', 'info');
  }, [setNodes, setEdges, triggerToast]);

  // Open the AI modal — but only for signed-in users (the endpoint is gated).
  const handleOpenAIGenerate = useCallback(() => {
    if (!user) {
      triggerToast('Sign in with Google to generate flows with AI.', 'warning');
      return;
    }
    setAiModalOpen(true);
  }, [user, triggerToast]);

  // Apply an AI-generated graph: auto-layout it, save as a new flow, and load it.
  const handleApplyGeneratedFlow = useCallback(
    (graph: GeneratedGraph) => {
      const { nodes: laidOutNodes, edges: laidOutEdges } = layoutGeneratedFlow(graph);

      const newId = `flow_${Date.now()}`;
      const newFlow: Flow = {
        id: newId,
        title: graph.title?.trim() || 'AI Generated Flow',
        description: graph.description?.trim() || '',
        icon: 'FlowArrow',
        nodes: laidOutNodes,
        edges: laidOutEdges,
      };

      const storedStr = localStorage.getItem('markchart_flows');
      let list: Flow[] = [];
      if (storedStr) {
        try {
          list = JSON.parse(storedStr);
        } catch {
          // ignore
        }
      }
      list.unshift(newFlow);
      localStorage.setItem('markchart_flows', JSON.stringify(list));
      setSavedFlows(list);

      loadFlow(newFlow);
      setAiModalOpen(false);
      triggerToast(`AI built "${newFlow.title}" — ${laidOutNodes.length} nodes.`, 'success');
    },
    [loadFlow, triggerToast]
  );

  // Flowchart title edit
  const handleTitleChange = useCallback((newTitle: string) => {
    setTitle(newTitle);
  }, []);

  // Flowchart description edit
  const handleDescriptionChange = useCallback((newDesc: string) => {
    setDescription(newDesc);
  }, []);

  // Flowchart icon edit
  const handleIconChange = useCallback((newIcon: string) => {
    setIconName(newIcon);
  }, []);

  // Rename action handler for sidebar lists
  const handleRenameFlow = useCallback((flowId: string, newTitle: string) => {
    if (flowId === currentFlowId) {
      setTitle(newTitle);
    }
    
    setSavedFlows((prev) => {
      const updated = prev.map((f) => (f.id === flowId ? { ...f, title: newTitle } : f));
      localStorage.setItem('markchart_flows', JSON.stringify(updated));
      return updated;
    });
  }, [currentFlowId]);

  // Delete action handler for sidebar lists
  const handleDeleteFlow = useCallback((flowId: string) => {
    setSavedFlows((prev) => {
      const updated = prev.filter((f) => f.id !== flowId);
      localStorage.setItem('markchart_flows', JSON.stringify(updated));

      if (flowId === currentFlowId) {
        if (updated.length > 0) {
          // Load next flow
          loadFlow(updated[0]);
        } else {
          // No flows left, allocate replacement
          setTimeout(() => {
            handleNewFlow();
          }, 0);
        }
      }

      return updated;
    });
    triggerToast('Flowchart deleted successfully.', 'info');
  }, [currentFlowId, loadFlow, handleNewFlow, triggerToast]);

  // Draggable Node logic for Canvas Dropping
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow') as NodeType;
      if (!type) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      addNodeDirectly(type, position);
    },
    [screenToFlowPosition]
  );

  // Directly spawn nodes in the center of viewport (on click) or specific offset
  const addNodeDirectly = useCallback((type: NodeType, position?: { x: number; y: number }) => {
    const newId = `node_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    let defaultLabel = '';
    if (type === 'start') defaultLabel = 'Start Process';
    else if (type === 'end') defaultLabel = 'End Process';
    else if (type === 'process') defaultLabel = 'Execute Task';
    else if (type === 'decision') defaultLabel = 'Check Condition';
    else if (type === 'loop') defaultLabel = 'Loop Until Complete';
    else if (type === 'io') defaultLabel = 'Log System Output';
    else if (type === 'note') defaultLabel = 'Reference: instructions';

    // Fallback coordinates (viewport centerpiece)
    const finalCoords = position || {
      x: 350 + (Math.random() - 0.5) * 80,
      y: 250 + (Math.random() - 0.5) * 80,
    };

    const newNode: RFNode = {
      id: newId,
      type,
      position: finalCoords,
      data: {
        label: defaultLabel,
        description: '',
        type: type as NodeType,
      },
    };

    setNodes((nds) => [...nds, newNode]);
    triggerToast(`Added a ${type.toUpperCase()} node.`, 'success');
  }, [setNodes, triggerToast]);

  // Connect handler
  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge({ ...connection, type: 'custom', data: { label: '' } }, eds));
    },
    [setEdges]
  );

  // Core generated pure outputs
  const markdownText = useMemo(() => toMarkdown(currentFlowModel), [currentFlowModel]);
  const mermaidText = useMemo(() => toMermaid(currentFlowModel), [currentFlowModel]);
  const validationWarnings = useMemo(() => validate(currentFlowModel), [currentFlowModel]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden text-zinc-900 bg-zinc-50 dark:text-zinc-50 dark:bg-zinc-950 transition-colors duration-200">
      {/* 1. APP HEADER */}
      {!isFocusMode && (
        <TopBar
          title={title}
          description={description}
          icon={iconName}
          onTitleChange={handleTitleChange}
          onDescriptionChange={handleDescriptionChange}
          onIconChange={handleIconChange}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode(!darkMode)}
          isFocusMode={isFocusMode}
          onToggleFocusMode={() => setIsFocusMode(true)}
          onOpenAIGenerate={handleOpenAIGenerate}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      )}

      {/* AI FLOW GENERATION MODAL */}
      {aiModalOpen && (
        <AIGenerateModal
          onClose={() => setAiModalOpen(false)}
          onApply={handleApplyGeneratedFlow}
        />
      )}

      {/* SETTINGS / API KEYS MODAL */}
      {settingsOpen && (
        <SettingsModal onClose={() => setSettingsOpen(false)} onToast={triggerToast} />
      )}

      {/* 2. MAIN WORKSPACE PANELS */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* LEFT COMPILER CONTROL */}
        {!isFocusMode && !leftCollapsed && (
          <Sidebar
            savedFlows={savedFlows}
            currentFlowId={currentFlowId}
            onLoadFlow={(id) => {
              const flow = savedFlows.find((f) => f.id === id);
              if (flow) loadFlow(flow);
            }}
            onDeleteFlow={handleDeleteFlow}
            onRenameFlow={handleRenameFlow}
            onNewFlow={handleNewFlow}
            onSaveToCloud={handleSaveToCloud}
            isSignedIn={!!user}
            savingCloud={savingCloud}
            cloudFlows={cloudFlows}
            onLoadCloudFlow={handleLoadCloudFlow}
            onDeleteCloudFlow={handleDeleteCloudFlow}
            onCollapse={() => {
              setLeftCollapsed(true);
              triggerToast('Collapsed left sidebar', 'info');
            }}
          />
        )}

        {/* CENTER INTERACTIVE FLOW editor CANVAS */}
        <main className="flex-1 relative h-full bg-zinc-100 dark:bg-zinc-950 flex flex-col">
          {/* FLOATING PALETTE TOOLBAR */}
          {!isFocusMode && (
            <NodeToolbar
              onAddNodeDirectly={(type) => addNodeDirectly(type)}
              onClearCanvas={handleClearCanvas}
              canClear={nodes.length > 0 || edges.length > 0}
            />
          )}

          {/* FLOATING ACTION PILL FOR LEFT COLLAPSE (IF COLLAPSED) */}
          {!isFocusMode && leftCollapsed && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 z-40">
              <button
                onClick={() => {
                  setLeftCollapsed(false);
                  triggerToast('Expanded left sidebar', 'success');
                }}
                className="flex items-center justify-center w-6 h-12 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-r-xl border-y border-r border-zinc-200/60 dark:border-zinc-800/60 shadow-lg hover:shadow-xl text-zinc-500 hover:text-indigo-650 dark:hover:text-indigo-400 transition-all active:scale-95 cursor-pointer"
                title="Expand Left Sidebar"
              >
                <CaretRight size={14} weight="bold" />
              </button>
            </div>
          )}

          {/* FLOATING ACTION PILL FOR RIGHT COLLAPSE (IF COLLAPSED) */}
          {!isFocusMode && rightCollapsed && (
            <div className="absolute right-0 top-1/2 -translate-y-1/2 z-40">
              <button
                onClick={() => {
                  setRightCollapsed(false);
                  triggerToast('Expanded right panel', 'success');
                }}
                className="flex items-center justify-center w-6 h-12 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-l-xl border-y border-l border-zinc-200/60 dark:border-zinc-800/60 shadow-lg hover:shadow-xl text-zinc-500 hover:text-indigo-650 dark:hover:text-indigo-400 transition-all active:scale-95 cursor-pointer"
                title="Expand Right Panel"
              >
                <CaretLeft size={14} weight="bold" />
              </button>
            </div>
          )}

          {/* FLOATING ACTION PILL FOR EXITING FOCUS MODE */}
          {isFocusMode && (
            <div className="absolute top-4 right-4 z-50">
              <button
                onClick={() => {
                  setIsFocusMode(false);
                  triggerToast('Exited focus mode', 'info');
                }}
                className="flex items-center gap-2 px-3.5 py-2 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md rounded-full border border-zinc-200/60 dark:border-zinc-800/60 shadow-lg hover:shadow-xl text-zinc-700 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-bold text-xs transition-all active:scale-95 cursor-pointer select-none group"
                title="Exit Focus Mode (Esc or F)"
              >
                <CornersIn size={14} weight="bold" className="transition-transform group-hover:scale-110" />
                <span>Exit Focus Mode</span>
                <kbd className="text-[9px] font-mono opacity-60 px-1 bg-zinc-100 dark:bg-zinc-800 rounded border border-zinc-200 dark:border-zinc-700 leading-none">
                  ESC
                </kbd>
              </button>
            </div>
          )}

          <ReactFlow
            nodes={nodesWithCallbacks}
            edges={edgesWithCallbacks}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDragOver={onDragOver}
            onDrop={onDrop}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            defaultEdgeOptions={{ type: 'custom' }}
            deleteKeyCode={['Backspace', 'Delete']}
            className="flex-1"
          >
            <Background 
              variant={BackgroundVariant.Dots} 
              gap={16} 
              size={1.2} 
              color={darkMode ? '#3f3f46' : '#d4d4d8'} 
            />
            <Controls showInteractive={false} position="bottom-left" />
            <MiniMap 
              nodeColor={() => {
                return darkMode ? '#18181b' : '#f4f4f5';
              }} 
              maskColor={darkMode ? 'rgba(0,0,0, 0.4)' : 'rgba(255,255,255, 0.4)'}
              position="bottom-right" 
            />
          </ReactFlow>
        </main>

        {/* RIGHT LIVE COMPOSER COMPILE ACCORDION */}
        {!isFocusMode && !rightCollapsed && (
          <OutputPanel
            flow={currentFlowModel}
            markdownContent={markdownText}
            mermaidContent={mermaidText}
            warnings={validationWarnings}
            onTriggerToast={triggerToast}
            onCollapse={() => {
              setRightCollapsed(true);
              triggerToast('Collapsed right panel', 'info');
            }}
          />
        )}
      </div>

      {/* GLOBAL TOAST BANNER OVERLAY */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <FlowEditor />
    </ReactFlowProvider>
  );
}
