import React, { useEffect, useRef, useState } from 'react';
import { Sparkle, X, Lightning, CircleNotch, Warning } from '@phosphor-icons/react';
import { generateFlow } from '../lib/api';
import { GeneratedGraph } from '../types';

interface AIGenerateModalProps {
  onClose: () => void;
  onApply: (graph: GeneratedGraph) => void;
}

const EXAMPLES = [
  'When a customer places an order, check inventory. If it’s in stock, charge their card and ship it. If payment fails, retry up to 3 times, then cancel the order.',
  'A user uploads a file. Validate that it’s a PDF under 10MB. If valid, extract the text and save it to the database; otherwise show an error and let them re-upload.',
  'CI pipeline: run the tests. If they pass, build the app and deploy to production. If they fail, notify the team on Slack and stop.',
];

const MAX_LEN = 2000;

export default function AIGenerateModal({ onClose, onApply }: AIGenerateModalProps) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Close on Escape (but not while a request is in flight).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [loading, onClose]);

  const submit = async () => {
    const trimmed = prompt.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setError(null);
    try {
      const graph = await generateFlow(trimmed);
      if (!graph?.nodes?.length) {
        throw new Error('The AI returned an empty flow. Try adding a bit more detail.');
      }
      onApply(graph);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  const onTextareaKeyDown = (e: React.KeyboardEvent) => {
    // Cmd/Ctrl + Enter submits.
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-[12vh] bg-zinc-950/40 dark:bg-zinc-950/60 backdrop-blur-sm animate-in fade-in duration-150"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div className="w-full max-w-xl rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-top-2 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-md">
              <Sparkle size={20} weight="fill" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
                Generate with AI
              </h2>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                Describe a process &mdash; Gemma builds the flowchart for you.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-lg p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40 cursor-pointer"
            title="Close"
          >
            <X size={16} weight="bold" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value.slice(0, MAX_LEN))}
              onKeyDown={onTextareaKeyDown}
              disabled={loading}
              rows={5}
              placeholder="e.g. When a support ticket comes in, classify its priority. If it&rsquo;s urgent, page the on-call engineer; otherwise add it to the queue and notify the team."
              className="w-full resize-none rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950/50 px-3.5 py-3 text-sm text-zinc-800 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all disabled:opacity-60"
            />
            <span className="absolute bottom-2.5 right-3 text-[10px] font-medium text-zinc-400 dark:text-zinc-600 tabular-nums select-none">
              {prompt.length}/{MAX_LEN}
            </span>
          </div>

          {/* Example prompts */}
          {!loading && (
            <div className="mt-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1.5">
                Try an example
              </div>
              <div className="flex flex-col gap-1.5">
                {EXAMPLES.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setPrompt(ex);
                      textareaRef.current?.focus();
                    }}
                    className="group text-left text-[11px] leading-snug text-zinc-600 dark:text-zinc-400 bg-zinc-50 hover:bg-indigo-50 dark:bg-zinc-950/40 dark:hover:bg-indigo-950/20 border border-zinc-200 dark:border-zinc-800 hover:border-indigo-200 dark:hover:border-indigo-900/50 rounded-lg px-3 py-2 transition-all cursor-pointer flex items-start gap-2"
                  >
                    <Lightning
                      size={12}
                      weight="fill"
                      className="mt-0.5 shrink-0 text-zinc-300 group-hover:text-indigo-500 dark:text-zinc-600 dark:group-hover:text-indigo-400 transition-colors"
                    />
                    <span className="line-clamp-2">{ex}</span>
                  </button>
                ))}
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
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/30">
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium hidden sm:block">
            Powered by Cloudflare Workers AI &middot; Gemma
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={onClose}
              disabled={loading}
              className="rounded-lg px-3.5 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={loading || !prompt.trim()}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 cursor-pointer"
            >
              {loading ? (
                <>
                  <CircleNotch size={14} weight="bold" className="animate-spin" />
                  Generating&hellip;
                </>
              ) : (
                <>
                  <Sparkle size={14} weight="fill" />
                  Generate Flow
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
