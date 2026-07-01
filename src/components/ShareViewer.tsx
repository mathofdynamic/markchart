import React, { useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Node as RFNode,
  Edge as RFEdge,
} from '@xyflow/react';
import {
  Moon,
  Sun,
  ArrowSquareOut,
  Link as LinkIcon,
  Check,
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
  Code,
  Eye,
  WarningCircle,
} from '@phosphor-icons/react';

import CustomNode from './CustomNode';
import CustomEdge from './CustomEdge';
import { NodeType } from '../types';
import { fetchShare, SharedFlow } from '../lib/api';

const nodeTypes = {
  start: CustomNode,
  end: CustomNode,
  process: CustomNode,
  decision: CustomNode,
  loop: CustomNode,
  io: CustomNode,
  note: CustomNode,
};

const edgeTypes = { custom: CustomEdge };

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
  Code,
};

interface ShareViewerProps {
  token: string;
}

function ShareCanvas({ share, darkMode }: { share: SharedFlow; darkMode: boolean }) {
  const nodes: RFNode[] = useMemo(
    () =>
      (share.nodes || []).map((n) => ({
        id: n.id,
        type: n.type,
        position: n.position,
        draggable: false,
        connectable: false,
        selectable: false,
        data: {
          label: n.label,
          description: n.description || '',
          type: n.type as NodeType,
          readOnly: true,
        },
      })),
    [share.nodes],
  );

  const edges: RFEdge[] = useMemo(
    () =>
      (share.edges || []).map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: 'custom',
        data: { label: e.label || '', readOnly: true },
      })),
    [share.edges],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      nodesFocusable={false}
      edgesFocusable={false}
      panOnScroll
      zoomOnScroll
      minZoom={0.1}
      proOptions={{ hideAttribution: true }}
      className="flex-1"
    >
      <Background variant={BackgroundVariant.Dots} gap={16} size={1.2} color={darkMode ? '#3f3f46' : '#d4d4d8'} />
      <Controls showInteractive={false} position="bottom-left" />
      <MiniMap
        nodeColor={() => (darkMode ? '#18181b' : '#f4f4f5')}
        maskColor={darkMode ? 'rgba(0,0,0, 0.4)' : 'rgba(255,255,255, 0.4)'}
        position="bottom-right"
      />
    </ReactFlow>
  );
}

export default function ShareViewer({ token }: ShareViewerProps) {
  const [share, setShare] = useState<SharedFlow | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'notfound' | 'error'>('loading');
  const [copied, setCopied] = useState(false);

  const [darkMode, setDarkMode] = useState<boolean>(() => localStorage.getItem('markchart_theme') === 'dark');

  // Keep the <html> theme class + persisted preference in sync.
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('markchart_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('markchart_theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    let cancelled = false;
    fetchShare(token)
      .then((data) => {
        if (cancelled) return;
        setShare(data);
        setStatus('ready');
        document.title = `${data.title || 'Shared flow'} · MarkChart`;
      })
      .catch((err) => {
        if (cancelled) return;
        setStatus(err?.message === 'not-found' ? 'notfound' : 'error');
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard may be unavailable; ignore
    }
  };

  const FlowIcon = (share && iconMap[share.icon]) || TreeStructure;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden text-zinc-900 bg-zinc-100 dark:text-zinc-50 dark:bg-zinc-950 transition-colors duration-200">
      {/* Minimal viewer header */}
      <header className="flex h-14 items-center justify-between border-b border-zinc-200 bg-white/80 dark:border-zinc-800 dark:bg-zinc-950/80 px-4 sm:px-6 backdrop-blur-md z-50 select-none">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-950 border border-zinc-800 dark:border-zinc-200 shadow-sm">
            <FlowIcon size={20} weight="bold" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 tracking-tight truncate">
                {share?.title || (status === 'loading' ? 'Loading…' : 'Shared flow')}
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 shrink-0 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-900/50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                <Eye size={11} weight="bold" /> View only
              </span>
            </div>
            {share?.description && (
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium truncate max-w-[60ch]">
                {share.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={copyLink}
            className="hidden sm:flex items-center gap-1.5 rounded-full pl-2.5 pr-3.5 py-2 text-xs font-semibold border border-zinc-200 bg-white text-zinc-700 hover:text-indigo-600 hover:bg-zinc-50 hover:border-indigo-200 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:text-indigo-400 dark:hover:bg-zinc-800/60 shadow-sm transition-all duration-150 active:scale-95 cursor-pointer"
            title="Copy this share link"
          >
            {copied ? <Check size={14} weight="bold" className="text-emerald-500" /> : <LinkIcon size={14} weight="bold" />}
            <span>{copied ? 'Copied' : 'Copy link'}</span>
          </button>

          <a
            href="/"
            className="flex items-center gap-1.5 rounded-full pl-3 pr-3.5 py-2 text-xs font-semibold border border-transparent bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-100 shadow-sm transition-all duration-150 active:scale-95"
            title="Open MarkChart to build your own"
          >
            <span className="hidden sm:inline">Build your own</span>
            <span className="sm:hidden">MarkChart</span>
            <ArrowSquareOut size={14} weight="bold" />
          </a>

          <button
            onClick={() => setDarkMode((v) => !v)}
            className="rounded-full p-2.5 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-900 transition-all duration-150 active:scale-90 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm cursor-pointer"
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {darkMode ? <Sun size={15} weight="bold" /> : <Moon size={15} weight="bold" />}
          </button>
        </div>
      </header>

      {/* Canvas / states */}
      <main className="flex-1 relative flex flex-col bg-zinc-100 dark:bg-zinc-950">
        {status === 'loading' && (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-zinc-400 dark:text-zinc-500">
              <div className="h-8 w-8 rounded-full border-2 border-zinc-300 border-t-indigo-500 dark:border-zinc-700 dark:border-t-indigo-400 animate-spin" />
              <span className="text-xs font-semibold">Loading shared flow…</span>
            </div>
          </div>
        )}

        {(status === 'notfound' || status === 'error') && (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="max-w-sm text-center flex flex-col items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 dark:text-rose-400 border border-rose-200/70 dark:border-rose-900/50">
                <WarningCircle size={28} weight="bold" />
              </div>
              <div>
                <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                  {status === 'notfound' ? 'This shared flow was not found' : 'Something went wrong'}
                </h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                  {status === 'notfound'
                    ? 'The link may be broken, or the share may have been removed.'
                    : 'We could not load this shared flow. Please try again in a moment.'}
                </p>
              </div>
              <a
                href="/"
                className="flex items-center gap-1.5 rounded-full pl-3.5 pr-4 py-2 text-xs font-semibold bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-100 shadow-sm transition-all active:scale-95"
              >
                Go to MarkChart <ArrowSquareOut size={14} weight="bold" />
              </a>
            </div>
          </div>
        )}

        {status === 'ready' && share && (
          <ReactFlowProvider>
            <ShareCanvas share={share} darkMode={darkMode} />
          </ReactFlowProvider>
        )}
      </main>
    </div>
  );
}
