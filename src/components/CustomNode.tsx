import React, { useState, useEffect, useRef } from 'react';
import { Handle, Position } from '@xyflow/react';
import { 
  Play, 
  Stop, 
  Gear, 
  GitBranch, 
  ArrowsClockwise, 
  Terminal, 
  Note, 
  PencilSimple
} from '@phosphor-icons/react';
import { NodeType } from '../types';

interface CustomNodeProps {
  id: string;
  selected?: boolean;
  type?: string;
  data: {
    label: string;
    description?: string;
    type?: NodeType;
    readOnly?: boolean;
    onLabelChange?: (id: string, newLabel: string) => void;
    onDescriptionChange?: (id: string, newDescription: string) => void;
    onEditingStart?: (id: string) => void;
    onEditingEnd?: () => void;
  };
}

export default function CustomNode({ id, selected, data, type }: CustomNodeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [labelValue, setLabelValue] = useState(data.label);
  const [descriptionValue, setDescriptionValue] = useState(data.description || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLabelValue(data.label);
  }, [data.label]);

  useEffect(() => {
    setDescriptionValue(data.description || '');
  }, [data.description]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    // Read-only (shared view): never enter edit mode.
    if (data.readOnly) return;
    // Prevent event from bubbling or panning the canvas
    e.stopPropagation();
    setIsEditing(true);
    if (data.onEditingStart) {
      data.onEditingStart(id);
    }
  };

  const handleSave = () => {
    setIsEditing(false);
    data.onLabelChange?.(id, labelValue);
    if (data.onDescriptionChange) {
      data.onDescriptionChange(id, descriptionValue);
    }
    if (data.onEditingEnd) {
      data.onEditingEnd();
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setLabelValue(data.label);
    setDescriptionValue(data.description || '');
    if (data.onEditingEnd) {
      data.onEditingEnd();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel();
    }
  };

  // Vibe Configurations based on Node Type
  const stylesMap: Record<NodeType, {
    bg: string;
    text: string;
    accent: string;
    border: string;
    icon: React.ComponentType<any>;
    iconColor: string;
    badgeLabel: string;
    outerRing: string;
    innerBg: string;
    formLabel: string;
    formInput: string;
    formBtnSave: string;
    formBtnCancel: string;
  }> = {
    start: {
      bg: 'bg-emerald-100 border-emerald-300 dark:bg-emerald-950/50 dark:border-emerald-800/80',
      text: 'text-emerald-950 dark:text-emerald-300',
      accent: 'emerald',
      border: 'border-emerald-300 dark:border-emerald-700/50',
      outerRing: 'ring-emerald-500/15 dark:ring-emerald-500/5',
      innerBg: 'bg-emerald-50/95 dark:bg-emerald-900/30 border border-emerald-200/60 dark:border-emerald-800/40',
      icon: Play,
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      badgeLabel: 'Start Node',
      formLabel: 'text-emerald-800/80 dark:text-emerald-400/85',
      formInput: 'bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 border-emerald-200 dark:border-emerald-800 focus:ring-emerald-500/30 focus:border-emerald-500 dark:focus:ring-emerald-400/30 dark:focus:border-emerald-400 placeholder-emerald-700/30 dark:placeholder-emerald-300/20',
      formBtnSave: 'bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white shadow-emerald-900/10 dark:shadow-emerald-950/30',
      formBtnCancel: 'text-emerald-600 dark:text-emerald-400/80 hover:text-emerald-900 dark:hover:text-emerald-200',
    },
    end: {
      bg: 'bg-rose-100 border-rose-300 dark:bg-rose-950/50 dark:border-rose-800/80',
      text: 'text-rose-950 dark:text-rose-300',
      accent: 'rose',
      border: 'border-rose-300 dark:border-rose-700/50',
      outerRing: 'ring-rose-500/15 dark:ring-rose-500/5',
      innerBg: 'bg-rose-50/95 dark:bg-rose-900/30 border border-rose-200/60 dark:border-rose-800/40',
      icon: Stop,
      iconColor: 'text-rose-600 dark:text-rose-400',
      badgeLabel: 'End Node',
      formLabel: 'text-rose-700/80 dark:text-rose-400/85',
      formInput: 'bg-rose-50/70 dark:bg-rose-950/40 text-rose-950 dark:text-rose-100 border-rose-200 dark:border-rose-800 focus:ring-rose-500/30 focus:border-rose-500 dark:focus:ring-rose-400/30 dark:focus:border-rose-400 placeholder-rose-700/30 dark:placeholder-rose-300/20',
      formBtnSave: 'bg-rose-600 hover:bg-rose-500 dark:bg-rose-600 dark:hover:bg-rose-500 text-white shadow-rose-900/10 dark:shadow-rose-950/30',
      formBtnCancel: 'text-rose-600 dark:text-rose-400/80 hover:text-rose-900 dark:hover:text-rose-200',
    },
    process: {
      bg: 'bg-zinc-100 border-zinc-200 dark:bg-zinc-900/50 dark:border-zinc-805',
      text: 'text-zinc-900 dark:text-zinc-200',
      accent: 'zinc',
      border: 'border-zinc-300 dark:border-zinc-700/60',
      outerRing: 'ring-zinc-400/10 dark:ring-zinc-500/5',
      innerBg: 'bg-white dark:bg-zinc-950 border border-zinc-200/50 dark:border-zinc-800/80',
      icon: Gear,
      iconColor: 'text-zinc-600 dark:text-zinc-400',
      badgeLabel: 'Process Step',
      formLabel: 'text-zinc-500 dark:text-zinc-400',
      formInput: 'bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700 focus:ring-zinc-500/30 focus:border-zinc-500 dark:focus:ring-zinc-400/30 dark:focus:border-zinc-400 placeholder-zinc-500/30 dark:placeholder-zinc-400/20',
      formBtnSave: 'bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-200 dark:hover:bg-zinc-100 text-white dark:text-zinc-950 shadow-zinc-950/10',
      formBtnCancel: 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200',
    },
    decision: {
      bg: 'bg-indigo-100 border-indigo-300 dark:bg-indigo-950/50 dark:border-indigo-800/80',
      text: 'text-indigo-950 dark:text-indigo-300',
      accent: 'indigo',
      border: 'border-indigo-300 dark:border-indigo-700/50',
      outerRing: 'ring-indigo-500/15 dark:ring-indigo-500/5',
      innerBg: 'bg-indigo-50/95 dark:bg-indigo-900/30 border border-indigo-200/60 dark:border-indigo-800/40',
      icon: GitBranch,
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      badgeLabel: 'Decision Point',
      formLabel: 'text-indigo-700/80 dark:text-indigo-400/85',
      formInput: 'bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-100 border-indigo-200 dark:border-indigo-800 focus:ring-indigo-500/30 focus:border-indigo-500 dark:focus:ring-indigo-400/30 dark:focus:border-indigo-400 placeholder-indigo-700/30 dark:placeholder-indigo-300/20',
      formBtnSave: 'bg-indigo-600 hover:bg-indigo-500 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white shadow-indigo-900/10 dark:shadow-indigo-950/30',
      formBtnCancel: 'text-indigo-600 dark:text-indigo-400/80 hover:text-indigo-900 dark:hover:text-indigo-200',
    },
    loop: {
      bg: 'bg-amber-100 border-amber-300 dark:bg-amber-950/50 dark:border-amber-800/80',
      text: 'text-amber-950 dark:text-amber-300',
      accent: 'amber',
      border: 'border-amber-300 dark:border-amber-700/50',
      outerRing: 'ring-amber-500/15 dark:ring-amber-500/5',
      innerBg: 'bg-amber-50/95 dark:bg-amber-900/30 border border-amber-200/60 dark:border-amber-800/40',
      icon: ArrowsClockwise,
      iconColor: 'text-amber-600 dark:text-amber-400',
      badgeLabel: 'Loop Cycle',
      formLabel: 'text-amber-700 dark:text-amber-400/85',
      formInput: 'bg-amber-50/70 dark:bg-amber-950/40 text-amber-950 dark:text-amber-100 border-amber-200 dark:border-amber-800 focus:ring-amber-500/30 focus:border-amber-500 dark:focus:ring-amber-400/30 dark:focus:border-amber-400 placeholder-amber-700/30 dark:placeholder-amber-300/20',
      formBtnSave: 'bg-amber-600 hover:bg-amber-500 dark:bg-amber-600 dark:hover:bg-amber-500 text-white shadow-amber-900/10 dark:shadow-amber-950/30',
      formBtnCancel: 'text-amber-600 dark:text-amber-400/85 hover:text-amber-900 dark:hover:text-amber-200',
    },
    io: {
      bg: 'bg-sky-100 border-sky-300 dark:bg-sky-950/50 dark:border-sky-800/80',
      text: 'text-sky-950 dark:text-sky-300',
      accent: 'sky',
      border: 'border-sky-300 dark:border-sky-700/50',
      outerRing: 'ring-sky-500/15 dark:ring-sky-500/5',
      innerBg: 'bg-sky-50/95 dark:bg-sky-900/30 border border-sky-200/60 dark:border-sky-800/40',
      icon: Terminal,
      iconColor: 'text-sky-600 dark:text-sky-400',
      badgeLabel: 'Input / Output',
      formLabel: 'text-sky-700/80 dark:text-sky-400/85',
      formInput: 'bg-sky-50/70 dark:bg-sky-950/40 text-sky-950 dark:text-sky-100 border-sky-200 dark:border-sky-800 focus:ring-sky-500/30 focus:border-sky-500 dark:focus:ring-sky-400/30 dark:focus:border-sky-400 placeholder-sky-700/30 dark:placeholder-sky-300/20',
      formBtnSave: 'bg-sky-600 hover:bg-sky-500 dark:bg-sky-600 dark:hover:bg-sky-500 text-white shadow-sky-900/10 dark:shadow-sky-950/30',
      formBtnCancel: 'text-sky-600 dark:text-sky-400/80 hover:text-sky-900 dark:hover:text-sky-200',
    },
    note: {
      bg: 'bg-yellow-100 border-yellow-300 dark:bg-yellow-950/50 dark:border-yellow-900/40',
      text: 'text-yellow-950 dark:text-yellow-300',
      accent: 'yellow',
      border: 'border-yellow-300 dark:border-yellow-900/40',
      outerRing: 'ring-yellow-500/15 dark:ring-yellow-500/5',
      innerBg: 'bg-yellow-50/95 dark:bg-yellow-950/30 border border-yellow-200/60 dark:border-yellow-900/30',
      icon: Note,
      iconColor: 'text-yellow-600 dark:text-yellow-400',
      badgeLabel: 'Reference Note',
      formLabel: 'text-yellow-800/80 dark:text-yellow-400/85',
      formInput: 'bg-yellow-50/70 dark:bg-yellow-950/40 text-yellow-950 dark:text-yellow-100 border-yellow-200 dark:border-yellow-800 focus:ring-yellow-500/30 focus:border-yellow-500 dark:focus:ring-yellow-400/30 dark:focus:border-yellow-400 placeholder-yellow-700/30 dark:placeholder-yellow-300/20',
      formBtnSave: 'bg-yellow-600 hover:bg-yellow-500 dark:bg-yellow-500 dark:hover:bg-yellow-400 text-yellow-950 dark:text-yellow-950 font-semibold shadow-yellow-900/10 dark:shadow-yellow-950/30',
      formBtnCancel: 'text-yellow-600 dark:text-yellow-400/80 hover:text-yellow-900 dark:hover:text-yellow-200',
    },
  };

  const nodeType = (type || data.type || 'process') as NodeType;
  const style = stylesMap[nodeType] || stylesMap.process;
  const IconComponent = style.icon;

  // Connection dots are kept mounted (so edges still anchor correctly) but made
  // invisible and inert in the read-only shared view.
  const handleClass = `!w-3 !h-3 !bg-zinc-300 hover:!bg-indigo-500 dark:!bg-zinc-700 dark:hover:!bg-indigo-400 !border-2 !border-white dark:!border-zinc-900 !transition-colors !duration-150 ${
    data.readOnly ? '!opacity-0 !pointer-events-none' : ''
  }`;

  // Selected State Highlights with custom accent glow/ring for each NodeType
  const selectedAccentMap: Record<NodeType, string> = {
    start: 'ring-2 ring-emerald-500 border-emerald-500 shadow-[0_12px_24px_-8px_rgba(16,185,129,0.3)] dark:ring-emerald-400 dark:border-emerald-400',
    end: 'ring-2 ring-rose-500 border-rose-500 shadow-[0_12px_24px_-8px_rgba(244,63,94,0.3)] dark:ring-rose-400 dark:border-rose-400',
    process: 'ring-2 ring-zinc-500 border-zinc-500 shadow-[0_12px_24px_-8px_rgba(120,113,108,0.25)] dark:ring-zinc-400 dark:border-zinc-400',
    decision: 'ring-2 ring-indigo-500 border-indigo-500 shadow-[0_12px_24px_-8px_rgba(99,102,241,0.3)] dark:ring-indigo-400 dark:border-indigo-400',
    loop: 'ring-2 ring-amber-500 border-amber-500 shadow-[0_12px_24px_-8px_rgba(245,158,11,0.3)] dark:ring-amber-400 dark:border-amber-400',
    io: 'ring-2 ring-sky-500 border-sky-500 shadow-[0_12px_24px_-8px_rgba(14,165,233,0.3)] dark:ring-sky-400 dark:border-sky-400',
    note: 'ring-2 ring-yellow-500 border-yellow-500 shadow-[0_12px_24px_-8px_rgba(234,179,8,0.3)] dark:ring-yellow-400 dark:border-yellow-400',
  };

  const selectedRingClass = selected
    ? `${selectedAccentMap[nodeType] || selectedAccentMap.process} scale-[1.02]`
    : 'shadow-[0_4px_12px_-4px_rgba(0,0,0,0.04)]';

  return (
    <div
      className={`relative rounded-2xl transition-all duration-200 group ${selectedRingClass}`}
      style={{ minWidth: '180px', maxWidth: '280px' }}
      onDoubleClick={handleDoubleClick}
    >
      {/* 4 Connection Points (Top, Bottom, Left, Right) */}
      <Handle type="target" position={Position.Top} id="t" className={handleClass} />
      <Handle type="source" position={Position.Bottom} id="b" className={handleClass} />
      <Handle type="target" position={Position.Left} id="l" className={handleClass} />
      <Handle type="source" position={Position.Right} id="r" className={handleClass} />

      {/* Double Bezel Card Frame */}
      <div className={`p-1.5 rounded-2xl border ${style.border} ${style.bg} ${style.outerRing} ring-4 transition-all duration-200`}>
        <div className={`px-4 py-3.5 rounded-xl ${style.innerBg} transition-all duration-200 flex flex-col gap-2`}>
          {/* Header Metadata Ribbon (Micro-typography) */}
          <div className="flex items-center justify-between gap-2 border-b border-black/5 dark:border-white/10 pb-1.5">
            <span className={`text-[10px] uppercase font-bold tracking-wider opacity-60 ${style.text}`}>
              {style.badgeLabel}
            </span>
            <div className="flex items-center gap-1.5">
              <IconComponent size={14} className={style.iconColor} weight="bold" />
            </div>
          </div>

          {/* Interactive Label & Description Textbox */}
          <div className="py-1 min-h-[36px] flex items-center justify-center text-center">
            {isEditing ? (
              <div className="flex flex-col gap-2 w-full text-left" onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
                <div>
                  <label className={`text-[10px] font-bold uppercase tracking-wide block mb-1 ${style.formLabel}`}>Title</label>
                  <input
                    ref={inputRef}
                    type="text"
                    value={labelValue}
                    onChange={(e) => setLabelValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className={`w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg focus:outline-none focus:ring-2 border transition-all ${style.formInput}`}
                    placeholder="Enter step title..."
                  />
                </div>
                <div>
                  <label className={`text-[10px] font-bold uppercase tracking-wide block mb-1 ${style.formLabel}`}>Description (Optional)</label>
                  <textarea
                    rows={2}
                    value={descriptionValue}
                    onChange={(e) => setDescriptionValue(e.target.value)}
                    className={`w-full text-[11px] px-2.5 py-1.5 rounded-lg focus:outline-none focus:ring-2 border transition-all resize-none ${style.formInput}`}
                    placeholder="Add step description..."
                  />
                </div>
                <div className="flex items-center justify-end gap-2 mt-1">
                  <button
                    onClick={handleCancel}
                    className={`px-2 py-1 text-[10px] font-medium transition-colors ${style.formBtnCancel}`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className={`px-3 py-1 text-[10px] font-semibold rounded-md shadow-sm transition-all active:scale-[0.98] ${style.formBtnSave}`}
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <div className="w-full">
                {/* Title */}
                <h4 className={`text-xs font-bold leading-relaxed select-none ${style.text} break-words w-full`}>
                  {data.label.trim() || <span className="italic opacity-60 text-[11px]">Untitled Step</span>}
                </h4>
                
                {/* Description below it if present */}
                {data.description && (
                  <p className="text-[10px] leading-relaxed select-none opacity-80 mt-1.5 dark:text-zinc-300 break-words w-full border-t border-black/5 dark:border-white/5 pt-1.5 font-normal text-left">
                    {data.description}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Active Prompt Guide on Hover (hidden in the read-only shared view) */}
          {!data.readOnly && (
            <div className="h-0 group-hover:h-auto overflow-hidden opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center gap-1.5 border-t border-black/5 dark:border-white/5 mt-1 pt-2">
              <div className="flex items-center gap-1 select-none">
                <PencilSimple size={10} className={`${style.iconColor}`} />
                <span className={`text-[9px] font-semibold opacity-60 ${style.text} uppercase tracking-wider`}>
                  {data.description ? 'Double-click to Edit Card' : 'Double-click to Add Description'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
