import React, { useState } from 'react';
import { 
  Plus, 
  Trash, 
  Pencil, 
  Check, 
  X, 
  CloudArrowUp,
  Folder,
  CaretLeft,
  TreeStructure,
  GitFork,
  Cpu,
  Graph,
  FlowArrow,
  Stack,
  Lightning,
  ShieldCheck,
  Gear,
  Database,
  PlugsConnected,
  Code
} from '@phosphor-icons/react';
import { Flow } from '../types';

const iconMap: Record<string, React.ComponentType<any>> = {
  TreeStructure,
  GitFork,
  Cpu,
  Graph,
  FlowArrow,
  Stack,
  Lightning,
  ShieldCheck,
  Gear,
  Database,
  PlugsConnected,
  Code
};

interface SidebarProps {
  // Saved Flow History Lists list
  savedFlows: Flow[];
  currentFlowId: string;
  onLoadFlow: (id: string) => void;
  onDeleteFlow: (id: string) => void;
  onRenameFlow: (id: string, newTitle: string) => void;
  onNewFlow: () => void;
  onSaveToCloud: () => void;
  onCollapse: () => void;
}

export default function Sidebar({
  savedFlows,
  currentFlowId,
  onLoadFlow,
  onDeleteFlow,
  onRenameFlow,
  onNewFlow,
  onSaveToCloud,
  onCollapse,
}: SidebarProps) {
  // Editing individual flow titles in history
  const [editingFlowId, setEditingFlowId] = useState<string | null>(null);
  const [editTitleValue, setEditTitleValue] = useState('');

  const startRename = (flow: Flow, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingFlowId(flow.id);
    setEditTitleValue(flow.title || 'Untitled Flow');
  };

  const saveRename = (id: string) => {
    if (editTitleValue.trim()) {
      onRenameFlow(id, editTitleValue.trim());
    }
    setEditingFlowId(null);
  };

  const cancelRename = () => {
    setEditingFlowId(null);
  };

  return (
    <aside className="w-80 border-r border-zinc-200 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-950/80 backdrop-blur-md flex flex-col h-full overflow-hidden">
      {/* 1. SAVED FLOW HISTORIES CONTAINER */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        <div className="p-5 pb-2 flex items-center justify-between shrink-0 gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={onCollapse}
              className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-300 transition-colors cursor-pointer mr-0.5"
              title="Collapse Left Sidebar"
            >
              <CaretLeft size={16} weight="bold" />
            </button>
            <div className="flex items-center gap-1.5">
              <Folder size={15} className="text-zinc-400" />
              <h2 className="text-xs uppercase font-bold tracking-wider text-zinc-500 dark:text-zinc-400">
                Saved Flows
              </h2>
            </div>
          </div>
          
          {/* New Flow Button */}
          <button
            onClick={onNewFlow}
            className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors cursor-pointer"
            title="Clear canvas to write a new flowchart"
          >
            <Plus size={12} weight="bold" />
            <span>New Flow</span>
          </button>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-2.5 min-h-0">
          {savedFlows.length === 0 ? (
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl py-8 px-4 text-center">
              <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500 mb-1">No saved flows.</span>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-normal max-w-[20ch]">
                Your process flowcharts auto-save locally to your browser!
              </p>
            </div>
          ) : (
            savedFlows.map((flow) => {
              const isCurrent = flow.id === currentFlowId;
              const isEditing = editingFlowId === flow.id;
              
              return (
                <div
                  key={flow.id}
                  onClick={() => !isEditing && onLoadFlow(flow.id)}
                  className={`group relative rounded-xl border p-3 transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-white border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 shadow-sm ring-1 ring-zinc-300/30'
                      : 'bg-zinc-100 hover:bg-white dark:bg-zinc-900/30 dark:hover:bg-zinc-900 border-transparent hover:border-zinc-200 dark:hover:border-zinc-800'
                  }`}
                >
                  <div className="flex flex-col gap-1.5">
                    {isEditing ? (
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editTitleValue}
                          onChange={(e) => setEditTitleValue(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && saveRename(flow.id)}
                          className="w-full bg-white dark:bg-zinc-800 px-2 py-1 text-xs border border-indigo-500 rounded font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          autoFocus
                        />
                        <button
                          onClick={() => saveRename(flow.id)}
                          className="p-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded transition-colors"
                          title="Save title"
                        >
                          <Check size={12} weight="bold" />
                        </button>
                        <button
                          onClick={cancelRename}
                          className="p-1 bg-zinc-200/50 hover:bg-zinc-200 text-zinc-650 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded transition-colors"
                          title="Cancel"
                        >
                          <X size={12} weight="bold" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 truncate">
                          {(() => {
                            const IconComponent = iconMap[flow.icon || 'TreeStructure'] || TreeStructure;
                            return (
                              <IconComponent 
                                size={14} 
                                weight="bold" 
                                className={isCurrent ? 'text-indigo-500' : 'text-zinc-400 dark:text-zinc-500'} 
                              />
                            );
                          })()}
                          <span className={`text-xs font-bold leading-tight truncate max-w-[110px] ${
                            isCurrent ? 'text-zinc-900 dark:text-white' : 'text-zinc-700 dark:text-zinc-300'
                          }`}>
                            {flow.title || 'Untitled Flow'}
                          </span>
                        </div>

                        {/* Action buttons (only displayed on hover or when current) */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => startRename(flow, e)}
                            className="p-1 hover:bg-zinc-200/50 dark:hover:bg-zinc-800 rounded text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                            title="Rename flowchart"
                          >
                            <Pencil size={11} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteFlow(flow.id);
                            }}
                            className="p-1 hover:bg-rose-500/10 rounded text-zinc-400 hover:text-rose-500 dark:hover:bg-rose-500/20"
                            title="Delete flowchart"
                          >
                            <Trash size={11} />
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-[9px] font-bold tracking-wide text-zinc-400 dark:text-zinc-500 uppercase">
                      <span>{flow.nodes?.length || 0} nodes</span>
                      <span>•</span>
                      <span>{flow.edges?.length || 0} edges</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 3. SYNC TO CLOUD FOOTER BANNER */}
      <div className="p-4 border-t border-zinc-200 bg-zinc-100/50 dark:border-zinc-800 dark:bg-zinc-900/50 shrink-0">
        <button
          onClick={onSaveToCloud}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 rounded-xl text-xs font-semibold transition-all duration-150 active:scale-95 shadow-sm"
        >
          <CloudArrowUp size={15} weight="bold" />
          <span>Save to Cloud</span>
        </button>
      </div>
    </aside>
  );
}
