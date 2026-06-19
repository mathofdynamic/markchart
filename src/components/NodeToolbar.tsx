import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Stop,
  Gear,
  GitBranch,
  ArrowsClockwise,
  Terminal,
  Note as NoteIcon,
  DotsSixVertical,
  Trash
} from '@phosphor-icons/react';
import { NodeType } from '../types';

interface NodeToolbarProps {
  onAddNodeDirectly: (type: NodeType) => void;
  onClearCanvas: () => void;
  canClear: boolean;
}

export default function NodeToolbar({ onAddNodeDirectly, onClearCanvas, canClear }: NodeToolbarProps) {
  // Two-click confirm so the canvas is never wiped by an accidental tap.
  const [confirming, setConfirming] = useState(false);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
    };
  }, []);

  const handleClearClick = () => {
    if (confirming) {
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
      setConfirming(false);
      onClearCanvas();
    } else {
      setConfirming(true);
      confirmTimer.current = setTimeout(() => setConfirming(false), 3000);
    }
  };
  const paletteItems: {
    type: NodeType;
    label: string;
    description: string;
    bg: string;
    text: string;
    border: string;
    icon: React.ComponentType<any>;
    iconColor: string;
  }[] = [
    {
      type: 'start',
      label: 'Start',
      description: 'The green origin of the flowchart pipeline.',
      bg: 'bg-emerald-50/50 hover:bg-emerald-50 dark:bg-emerald-950/10 dark:hover:bg-emerald-950/20',
      text: 'text-emerald-900 dark:text-emerald-300',
      border: 'border-emerald-200/60 dark:border-emerald-900/40',
      icon: Play,
      iconColor: 'text-emerald-500',
    },
    {
      type: 'end',
      label: 'End',
      description: 'Specifies visual flow terminals.',
      bg: 'bg-rose-50/50 hover:bg-rose-50 dark:bg-rose-950/10 dark:hover:bg-rose-950/20',
      text: 'text-rose-900 dark:text-rose-300',
      border: 'border-rose-200/60 dark:border-rose-900/40',
      icon: Stop,
      iconColor: 'text-rose-500',
    },
    {
      type: 'process',
      label: 'Action',
      description: 'Sequential computations or functions.',
      bg: 'bg-slate-50 hover:bg-slate-100 dark:bg-zinc-900/50 dark:hover:bg-zinc-900/80',
      text: 'text-slate-950 dark:text-zinc-200',
      border: 'border-slate-200 dark:border-zinc-800',
      icon: Gear,
      iconColor: 'text-zinc-500 dark:text-zinc-400',
    },
    {
      type: 'decision',
      label: 'Decision',
      description: 'Branches flow based on conditional logic.',
      bg: 'bg-indigo-50/50 hover:bg-indigo-50 dark:bg-indigo-950/10 dark:hover:bg-indigo-950/20',
      text: 'text-indigo-950 dark:text-indigo-300',
      border: 'border-indigo-200/60 dark:border-indigo-900/40',
      icon: GitBranch,
      iconColor: 'text-indigo-500',
    },
    {
      type: 'loop',
      label: 'Loop',
      description: 'Loops process sequences repeatedly.',
      bg: 'bg-amber-50/50 hover:bg-amber-50 dark:bg-amber-950/10 dark:hover:bg-amber-950/20',
      text: 'text-amber-950 dark:text-amber-300',
      border: 'border-amber-200/60 dark:border-amber-900/40',
      icon: ArrowsClockwise,
      iconColor: 'text-amber-600',
    },
    {
      type: 'io',
      label: 'Input / Output',
      description: 'Data inputs/outputs flow codes.',
      bg: 'bg-sky-50/50 hover:bg-sky-50 dark:bg-sky-950/10 dark:hover:bg-sky-950/20',
      text: 'text-sky-950 dark:text-sky-300',
      border: 'border-sky-200/60 dark:border-sky-900/40',
      icon: Terminal,
      iconColor: 'text-sky-500',
    },
    {
      type: 'note',
      label: 'Note',
      description: 'Annotations or workspace descriptors.',
      bg: 'bg-yellow-50/40 hover:bg-yellow-50/85 dark:bg-yellow-950/5 dark:hover:bg-yellow-950/10',
      text: 'text-zinc-950 dark:text-yellow-100',
      border: 'border-yellow-200/60 dark:border-yellow-900/30',
      icon: NoteIcon,
      iconColor: 'text-yellow-600',
    },
  ];

  const handleDragStart = (event: React.DragEvent, nodeType: NodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-4 px-4 py-2 bg-white/90 dark:bg-zinc-950/85 backdrop-blur-md rounded-2xl border border-zinc-250 dark:border-zinc-800/80 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.08)] select-none max-w-[90vw] overflow-x-auto no-scrollbar pointer-events-auto">
      <div className="flex items-center gap-2 shrink-0 border-r border-zinc-200 dark:border-zinc-800/80 pr-3 mr-1">
        <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 dark:text-zinc-400">
          Palette
        </span>
      </div>

      <div className="flex items-center gap-2.5 flex-nowrap shrink-0">
        {paletteItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.type}
              draggable
              onDragStart={(e) => handleDragStart(e, item.type)}
              onClick={() => onAddNodeDirectly(item.type)}
              className={`group flex flex-col items-center justify-center rounded-xl border ${item.border} ${item.bg} cursor-grab active:cursor-grabbing transition-all duration-150 select-none hover:-translate-y-[1px] hover:shadow-[0_4px_8px_-3px_rgba(0,0,0,0.05)] active:scale-[0.98] w-20 min-w-[80px] h-14 shrink-0 py-1.5 relative`}
              title={`${item.description} (Drag or Click to append)`}
            >
              <div className="absolute left-1 top-2 opacity-0 group-hover:opacity-40 transition-opacity text-zinc-400 pointer-events-none">
                <DotsSixVertical size={10} weight="bold" />
              </div>
              <div className="flex items-center justify-center h-6 w-6 transition-transform group-hover:scale-105">
                <Icon size={18} className={item.iconColor} weight="bold" />
              </div>
              <span className={`text-[10px] font-bold leading-none mt-1 text-center truncate w-full px-1 ${item.text}`}>
                {item.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Clear canvas — two-click confirm, separated from the additive palette. */}
      <div className="flex items-center shrink-0 border-l border-zinc-200 dark:border-zinc-800/80 pl-3 ml-1">
        <button
          onClick={handleClearClick}
          disabled={!canClear && !confirming}
          className={`group flex flex-col items-center justify-center rounded-xl border transition-all duration-150 select-none hover:-translate-y-[1px] active:scale-[0.98] w-20 min-w-[80px] h-14 shrink-0 py-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 ${
            confirming
              ? 'bg-rose-500 border-rose-500 text-white shadow-[0_4px_10px_-3px_rgba(244,63,94,0.5)]'
              : 'bg-rose-50/50 hover:bg-rose-50 dark:bg-rose-950/10 dark:hover:bg-rose-950/20 border-rose-200/60 dark:border-rose-900/40 text-rose-900 dark:text-rose-300'
          }`}
          title={confirming ? 'Click again to clear the whole canvas' : 'Clear the entire canvas'}
        >
          <div className="flex items-center justify-center h-6 w-6 transition-transform group-hover:scale-105">
            <Trash size={18} weight="bold" className={confirming ? 'text-white' : 'text-rose-500'} />
          </div>
          <span className="text-[10px] font-bold leading-none mt-1 text-center truncate w-full px-1">
            {confirming ? 'Confirm?' : 'Clear'}
          </span>
        </button>
      </div>
    </div>
  );
}
