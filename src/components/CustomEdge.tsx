import React, { useState, useEffect, useRef } from 'react';
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps, type Edge } from '@xyflow/react';
import { PencilSimple } from '@phosphor-icons/react';

// Define the shape of our edge details
export type CustomEdgeProps = EdgeProps<
  Edge<{
    label: string;
    readOnly?: boolean;
    onLabelChange?: (id: string, newLabel: string) => void;
  }>
>;

function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}: CustomEdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(data?.label || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue(data?.label || '');
  }, [data?.label]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (data?.readOnly) return;
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (data?.onLabelChange) {
      data.onLabelChange(id, value);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setIsEditing(false);
      if (data?.onLabelChange) {
        data.onLabelChange(id, value);
      }
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setValue(data?.label || '');
    }
  };

  // Read-only (shared view): render just the line, plus a static label pill if present.
  if (data?.readOnly) {
    return (
      <>
        <BaseEdge path={edgePath} markerEnd={markerEnd} style={{ strokeWidth: 2, ...(style as React.CSSProperties) }} />
        {data.label && (
          <EdgeLabelRenderer>
            <div
              style={{
                position: 'absolute',
                transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
                pointerEvents: 'none',
              }}
              className="nodrag nopan flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide border bg-zinc-900 border-zinc-800 text-zinc-50 dark:bg-zinc-100 dark:border-white dark:text-zinc-900 shadow-md"
            >
              {data.label}
            </div>
          </EdgeLabelRenderer>
        )}
      </>
    );
  }

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={{ strokeWidth: 2, ...(style as React.CSSProperties) }} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className="bg-white dark:bg-zinc-900 text-[10px] font-semibold text-zinc-900 dark:text-zinc-100 border border-indigo-500 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-24 text-center shadow-lg"
            />
          ) : (
            <button
              onDoubleClick={handleDoubleClick}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide border transition-all duration-150 group cursor-pointer ${
                data?.label
                  ? 'bg-zinc-900 border-zinc-800 text-zinc-50 dark:bg-zinc-100 dark:border-white dark:text-zinc-900 shadow-md'
                  : 'bg-white border-zinc-200 text-zinc-400 opacity-0 group-hover:opacity-100 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-500 hover:opacity-100 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
              title="Double-click to edit branch path label (e.g. Yes / No)"
            >
              <span>{data?.label || 'ADD BRANCH LABEL'}</span>
              <PencilSimple size={10} className="opacity-60 group-hover:opacity-100 transition-opacity" />
            </button>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

// Memoized so edges re-render only when their own props change, not on every
// canvas state update. Relies on App passing a stable `data` identity.
export default React.memo(CustomEdge);
