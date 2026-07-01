import React, { useEffect, useRef, useState } from 'react';
import {
  Sparkle,
  X,
  Lightning,
  CircleNotch,
  Warning,
  ClockCounterClockwise,
  ListChecks,
  CheckCircle,
  PencilSimple,
  FlowArrow,
} from '@phosphor-icons/react';
import { generateFlow, reviewFlow, ProcessReview } from '../lib/api';
import { GeneratedGraph } from '../types';
import {
  loadHistory,
  addToHistory,
  removeFromHistory,
  clearHistory,
  loadFlowPrompts,
  removeFlowPrompt,
} from '../lib/promptHistory';

interface AIGenerateModalProps {
  onClose: () => void;
  onApply: (graph: GeneratedGraph, prompt?: string) => void;
  currentFlowId: string;
}

const EXAMPLES = [
  'When a customer places an order, check inventory. If it’s in stock, charge their card and ship it. If payment fails, retry up to 3 times, then cancel the order.',
  'A user uploads a file. Validate that it’s a PDF under 10MB. If valid, extract the text and save it to the database; otherwise show an error and let them re-upload.',
  'CI pipeline: run the tests. If they pass, build the app and deploy to production. If they fail, notify the team on Slack and stop.',
];

const MAX_LEN = 2000;

export default function AIGenerateModal({ onClose, onApply, currentFlowId }: AIGenerateModalProps) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [busyLabel, setBusyLabel] = useState('Generating…');
  const [error, setError] = useState<string | null>(null);
  const [checkFix, setCheckFix] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [flowPrompts, setFlowPrompts] = useState<string[]>([]);
  const [review, setReview] = useState<ProcessReview | null>(null);
  const [originalPrompt, setOriginalPrompt] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
    setHistory(loadHistory());
    setFlowPrompts(loadFlowPrompts(currentFlowId));
  }, [currentFlowId]);

  // Close on Escape (but not while a request is in flight).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [loading, onClose]);

  // Generate a flow from `textToSend`; on success, save `originalForHistory` (the
  // text the USER typed, not an AI-refined version) to the recent-prompts list.
  const doGenerate = async (textToSend: string, originalForHistory: string) => {
    setLoading(true);
    setBusyLabel('Generating…');
    setError(null);
    try {
      const graph = await generateFlow(textToSend.trim());
      if (!graph?.nodes?.length) {
        throw new Error('The AI returned an empty flow. Try adding a bit more detail.');
      }
      addToHistory(originalForHistory.trim());
      onApply(graph, originalForHistory.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  const doReview = async (text: string) => {
    setLoading(true);
    setBusyLabel('Reviewing logic…');
    setError(null);
    try {
      const result = await reviewFlow(text.trim());
      setOriginalPrompt(text.trim());
      setReview(result);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not review the description. Please try again.');
      setLoading(false);
    }
  };

  const submit = () => {
    const trimmed = prompt.trim();
    if (!trimmed || loading) return;
    if (checkFix) {
      doReview(trimmed);
    } else {
      doGenerate(trimmed, trimmed);
    }
  };

  const onTextareaKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      submit();
    }
  };

  const inReview = review !== null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-[10vh] bg-zinc-950/40 dark:bg-zinc-950/60 backdrop-blur-sm animate-in fade-in duration-150"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div className="w-full max-w-xl max-h-[85vh] flex flex-col rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-top-2 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-4 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-md">
              {inReview ? <ListChecks size={20} weight="fill" /> : <Sparkle size={20} weight="fill" />}
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
                {inReview ? 'Logic review' : 'Generate with AI'}
              </h2>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                {inReview
                  ? 'Review the suggested fixes, then generate.'
                  : 'Describe a process — Gemma builds the flowchart for you.'}
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
        <div className="px-5 py-4 overflow-y-auto">
          {!inReview ? (
            <>
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value.slice(0, MAX_LEN))}
                  onKeyDown={onTextareaKeyDown}
                  disabled={loading}
                  rows={5}
                  placeholder="e.g. When a support ticket comes in, classify its priority. If it’s urgent, page the on-call engineer; otherwise add it to the queue and notify the team."
                  className="w-full resize-none rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950/50 px-3.5 py-3 text-sm text-zinc-800 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all disabled:opacity-60"
                />
                <span className="absolute bottom-2.5 right-3 text-[10px] font-medium text-zinc-400 dark:text-zinc-600 tabular-nums select-none">
                  {prompt.length}/{MAX_LEN}
                </span>
              </div>

              {/* Check & fix toggle */}
              <label className="mt-3 flex items-center gap-2.5 cursor-pointer select-none group">
                <input
                  type="checkbox"
                  checked={checkFix}
                  onChange={(e) => setCheckFix(e.target.checked)}
                  disabled={loading}
                  className="peer sr-only"
                />
                <span className="relative h-5 w-9 rounded-full bg-zinc-200 dark:bg-zinc-700 peer-checked:bg-indigo-600 transition-colors after:absolute after:top-0.5 after:left-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-4 shrink-0" />
                <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                  Check &amp; fix the logic first
                  <span className="block text-[10px] font-normal text-zinc-400 dark:text-zinc-500">
                    AI reviews your description and suggests fixes before generating.
                  </span>
                </span>
              </label>

              {/* Prompts used for the current flow */}
              {!loading && flowPrompts.length > 0 && (
                <div className="mt-4">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1.5">
                    <FlowArrow size={12} weight="bold" /> Used for this flow
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {flowPrompts.map((item, i) => (
                      <div
                        key={i}
                        className="group flex items-start gap-2 text-[11px] leading-snug text-zinc-600 dark:text-zinc-400 bg-indigo-50/40 hover:bg-indigo-50 dark:bg-indigo-950/10 dark:hover:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 hover:border-indigo-200 dark:hover:border-indigo-900/60 rounded-lg px-3 py-2 transition-all"
                      >
                        <button
                          onClick={() => {
                            setPrompt(item);
                            textareaRef.current?.focus();
                          }}
                          className="flex-1 text-left cursor-pointer line-clamp-2"
                        >
                          {item}
                        </button>
                        <button
                          onClick={() => setFlowPrompts(removeFlowPrompt(currentFlowId, item))}
                          className="shrink-0 opacity-0 group-hover:opacity-100 p-0.5 text-zinc-400 hover:text-rose-500 transition-all cursor-pointer"
                          title="Remove"
                        >
                          <X size={12} weight="bold" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent prompts (across all flows) */}
              {!loading && history.length > 0 && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                      <ClockCounterClockwise size={12} weight="bold" /> Recent
                    </div>
                    <button
                      onClick={() => setHistory(clearHistory())}
                      className="text-[10px] font-semibold text-zinc-400 hover:text-rose-500 transition-colors cursor-pointer"
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {history.map((item, i) => (
                      <div
                        key={i}
                        className="group flex items-start gap-2 text-[11px] leading-snug text-zinc-600 dark:text-zinc-400 bg-zinc-50 hover:bg-indigo-50 dark:bg-zinc-950/40 dark:hover:bg-indigo-950/20 border border-zinc-200 dark:border-zinc-800 hover:border-indigo-200 dark:hover:border-indigo-900/50 rounded-lg px-3 py-2 transition-all"
                      >
                        <button
                          onClick={() => {
                            setPrompt(item);
                            textareaRef.current?.focus();
                          }}
                          className="flex-1 text-left cursor-pointer line-clamp-2"
                        >
                          {item}
                        </button>
                        <button
                          onClick={() => setHistory(removeFromHistory(item))}
                          className="shrink-0 opacity-0 group-hover:opacity-100 p-0.5 text-zinc-400 hover:text-rose-500 transition-all cursor-pointer"
                          title="Remove"
                        >
                          <X size={12} weight="bold" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Example prompts */}
              {!loading && (
                <div className="mt-4">
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
            </>
          ) : (
            /* Review panel */
            <>
              {review!.issues.length > 0 ? (
                <div className="rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/20 p-3">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-700 dark:text-amber-300 mb-1.5">
                    <Warning size={14} weight="fill" /> Issues found ({review!.issues.length})
                  </div>
                  <ul className="space-y-1">
                    {review!.issues.map((issue, i) => (
                      <li key={i} className="flex items-start gap-2 text-[11px] leading-snug text-amber-800 dark:text-amber-200">
                        <span className="mt-1.5 h-1 w-1 rounded-full bg-amber-500 shrink-0" />
                        <span>{issue}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/20 px-3 py-2.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                  <CheckCircle size={15} weight="fill" /> No logical issues found — your description looks solid.
                </div>
              )}

              <div className="mt-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1.5">
                  Revised description (editable)
                </div>
                <textarea
                  value={review!.refined}
                  onChange={(e) => setReview({ ...review!, refined: e.target.value.slice(0, MAX_LEN) })}
                  disabled={loading}
                  rows={5}
                  className="w-full resize-none rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950/50 px-3.5 py-3 text-sm text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all disabled:opacity-60"
                />
              </div>

              {/* Secondary review actions */}
              {!loading && (
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={() => {
                      setPrompt(review!.refined);
                      setReview(null);
                      setTimeout(() => textareaRef.current?.focus(), 0);
                    }}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    <PencilSimple size={13} weight="bold" /> Edit
                  </button>
                  <button
                    onClick={() => doGenerate(originalPrompt, originalPrompt)}
                    className="rounded-lg px-3 py-1.5 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    Use my original
                  </button>
                </div>
              )}
            </>
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
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/30 shrink-0">
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium hidden sm:block">
            Powered by Cloudflare Workers AI · Gemma
          </span>
          <div className="flex items-center gap-2 ml-auto">
            {inReview && (
              <button
                onClick={() => {
                  setReview(null);
                  setError(null);
                }}
                disabled={loading}
                className="rounded-lg px-3.5 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40 cursor-pointer"
              >
                Back
              </button>
            )}
            {!inReview && (
              <button
                onClick={onClose}
                disabled={loading}
                className="rounded-lg px-3.5 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40 cursor-pointer"
              >
                Cancel
              </button>
            )}
            <button
              onClick={inReview ? () => doGenerate(review!.refined, originalPrompt) : submit}
              disabled={loading || (!inReview && !prompt.trim())}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 cursor-pointer"
            >
              {loading ? (
                <>
                  <CircleNotch size={14} weight="bold" className="animate-spin" />
                  {busyLabel}
                </>
              ) : inReview ? (
                <>
                  <Sparkle size={14} weight="fill" />
                  Generate from revised
                </>
              ) : checkFix ? (
                <>
                  <ListChecks size={14} weight="fill" />
                  Review &amp; generate
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
