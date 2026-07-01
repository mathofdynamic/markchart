import React, { useEffect, useRef, useState } from 'react';
import {
  FileArrowDown,
  X,
  UploadSimple,
  CircleNotch,
  Warning,
  Sparkle,
  BookOpen,
} from '@phosphor-icons/react';
import { parseFlowInput } from '../lib/markdownImport';
import { generateFlow } from '../lib/api';
import { GeneratedGraph } from '../types';
import { useFocusTrap } from '../lib/useFocusTrap';

interface ImportModalProps {
  onClose: () => void;
  onApply: (graph: GeneratedGraph, source: string) => void;
  isSignedIn: boolean;
  onToast: (message: string, type?: 'success' | 'info' | 'warning') => void;
}

const MAX_IMPORT = 100_000; // ~100 KB
const AI_MAX = 2000; // model prompt limit

const CHEATSHEET = `# My Flow
> Optional one-line description

[start]    n1: User submits form
[decision] n2: Valid input?
[process]  n3: Save to database
[end]      n4: Done
[end]      n5: Show error

n1 -> n2
n2 -> n3 : Yes
n2 -> n5 : No
n3 -> n4`;

export default function ImportModal({ onClose, onApply, isSignedIn, onToast }: ImportModalProps) {
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notRecognized, setNotRecognized] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useFocusTrap<HTMLDivElement>();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !aiLoading) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [aiLoading, onClose]);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_IMPORT) {
      setError(`That file is too large (max ${Math.round(MAX_IMPORT / 1000)} KB).`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setText(String(reader.result || '').slice(0, MAX_IMPORT));
      setFileName(file.name);
      setError(null);
      setNotRecognized(false);
    };
    reader.onerror = () => setError('Could not read that file.');
    reader.readAsText(file);
  };

  const handleImport = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setError(null);
    const parsed = parseFlowInput(trimmed);
    if (parsed) {
      onApply(parsed.graph, parsed.format === 'simple' ? 'Simple format' : 'Mermaid');
    } else {
      setNotRecognized(true);
    }
  };

  const handleAIInterpret = async () => {
    const trimmed = text.trim();
    if (!trimmed || aiLoading) return;
    if (!isSignedIn) {
      onToast('Sign in with Google to interpret text with AI.', 'warning');
      return;
    }
    if (trimmed.length > AI_MAX) {
      setError(`That's too long for AI interpretation (max ${AI_MAX} characters). Use the Simple or Mermaid format for large flows.`);
      return;
    }
    setAiLoading(true);
    setError(null);
    try {
      const graph = await generateFlow(trimmed);
      if (!graph?.nodes?.length) throw new Error('The AI could not build a flow from that text.');
      onApply(graph, 'AI');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI interpretation failed.');
      setAiLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-[8vh] bg-zinc-950/40 dark:bg-zinc-950/60 backdrop-blur-sm animate-in fade-in duration-150"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !aiLoading) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-modal-title"
        tabIndex={-1}
        className="w-full max-w-xl max-h-[85vh] flex flex-col rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-top-2 duration-200 focus:outline-none"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-4 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-950 shadow-md">
              <FileArrowDown size={20} weight="fill" />
            </div>
            <div>
              <h2 id="import-modal-title" className="text-sm font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
                Import a flow
              </h2>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                Paste or upload Markdown / Mermaid — or any text, and let AI interpret it.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={aiLoading}
            className="rounded-lg p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40 cursor-pointer"
            title="Close"
          >
            <X size={16} weight="bold" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <UploadSimple size={14} weight="bold" /> Upload .md / .txt
            </button>
            <button
              onClick={() => setShowGuide((s) => !s)}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
            >
              <BookOpen size={13} weight="bold" /> Format guide
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".md,.txt,.mermaid,.mmd,text/markdown,text/plain"
              onChange={onFile}
              className="hidden"
            />
          </div>

          {fileName && (
            <div className="mb-2 text-[10px] text-zinc-400 dark:text-zinc-500">
              Loaded <span className="font-mono text-zinc-500 dark:text-zinc-400">{fileName}</span>
            </div>
          )}

          {showGuide && (
            <div className="mb-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1.5">
                Simple format
              </div>
              <pre className="text-[10.5px] leading-relaxed font-mono text-zinc-600 dark:text-zinc-300 whitespace-pre overflow-x-auto no-scrollbar">
{CHEATSHEET}
              </pre>
              <p className="mt-2 text-[10.5px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Node types: <code className="font-mono">start, end, process, decision, loop, io, note</code>. Mermaid
                <code className="font-mono"> flowchart</code> blocks are also accepted. Full spec:{' '}
                <a href="/FLOW_FORMAT.md" target="_blank" rel="noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold">
                  FLOW_FORMAT.md
                </a>
              </p>
            </div>
          )}

          <div className="relative">
            <textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value.slice(0, MAX_IMPORT));
                setNotRecognized(false);
                setError(null);
              }}
              disabled={aiLoading}
              rows={10}
              placeholder={`Paste a flow here…\n\n${CHEATSHEET}`}
              className="w-full resize-none rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950/50 px-3.5 py-3 text-[12px] font-mono text-zinc-800 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all disabled:opacity-60"
            />
          </div>

          {/* Not-recognized → offer AI */}
          {notRecognized && !error && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-indigo-200 dark:border-indigo-900/40 bg-indigo-50 dark:bg-indigo-950/20 px-3 py-2.5">
              <Sparkle size={15} weight="fill" className="mt-px shrink-0 text-indigo-500" />
              <div className="text-[11px] text-indigo-800 dark:text-indigo-200">
                This text isn’t in the Simple or Mermaid format. You can let AI interpret it into a flow instead.
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/20 px-3 py-2 text-[11px] font-medium text-rose-700 dark:text-rose-300">
              <Warning size={14} weight="fill" className="mt-px shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/30 shrink-0">
          <button
            onClick={onClose}
            disabled={aiLoading}
            className="rounded-lg px-3.5 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40 cursor-pointer"
          >
            Cancel
          </button>
          {notRecognized ? (
            <button
              onClick={handleAIInterpret}
              disabled={aiLoading || !text.trim()}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {aiLoading ? (
                <>
                  <CircleNotch size={14} weight="bold" className="animate-spin" /> Interpreting…
                </>
              ) : (
                <>
                  <Sparkle size={14} weight="fill" /> Interpret with AI
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleImport}
              disabled={!text.trim()}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <FileArrowDown size={14} weight="fill" /> Import
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
