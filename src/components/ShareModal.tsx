import React, { useEffect, useState } from 'react';
import { ShareNetwork, X, Check, Copy, ArrowSquareOut, Eye, WarningCircle } from '@phosphor-icons/react';
import { Flow } from '../types';
import { createShare } from '../lib/api';
import { loadShareRef, saveShareRef } from '../lib/shareStore';

interface ShareModalProps {
  flow: Flow;
  flowId: string;
  onClose: () => void;
  onToast: (message: string, type?: 'success' | 'info' | 'warning') => void;
}

export default function ShareModal({ flow, flowId, onClose, onToast }: ShareModalProps) {
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Publish (or update) the share as soon as the modal opens, so the link
  // always reflects the current canvas.
  useEffect(() => {
    let cancelled = false;

    async function publish() {
      setLoading(true);
      setError('');
      try {
        const prev = loadShareRef(flowId);
        const res = await createShare({
          flowId,
          title: flow.title,
          description: flow.description,
          icon: flow.icon,
          nodes: flow.nodes,
          edges: flow.edges,
          ...(prev ? { token: prev.token, editSecret: prev.editSecret } : {}),
        });
        if (cancelled) return;

        // A fresh share returns a secret; an in-place update reuses the cached one.
        if (res.editSecret) {
          saveShareRef(flowId, { token: res.token, editSecret: res.editSecret });
        }
        setUrl(`${window.location.origin}/s/${res.token}`);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Could not create the share link.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    publish();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowId]);

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      onToast('Share link copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 1800);
    } catch {
      onToast('Could not copy automatically — select and copy the link.', 'warning');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-950/40 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/50">
              <ShareNetwork size={18} weight="bold" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">Share this flow</h2>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                <Eye size={12} weight="bold" /> Anyone with the link can view (read-only)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Close"
          >
            <X size={16} weight="bold" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5">
          {loading && (
            <div className="flex items-center gap-3 text-zinc-500 dark:text-zinc-400 py-2">
              <div className="h-5 w-5 rounded-full border-2 border-zinc-300 border-t-indigo-500 dark:border-zinc-700 dark:border-t-indigo-400 animate-spin" />
              <span className="text-sm font-medium">Creating your share link…</span>
            </div>
          )}

          {!loading && error && (
            <div className="flex items-start gap-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200/70 dark:border-rose-900/50 px-3.5 py-3 text-rose-700 dark:text-rose-300">
              <WarningCircle size={18} weight="bold" className="shrink-0 mt-0.5" />
              <p className="text-xs font-medium leading-relaxed">{error}</p>
            </div>
          )}

          {!loading && !error && url && (
            <>
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                Public link
              </label>
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  readOnly
                  value={url}
                  onFocus={(e) => e.target.select()}
                  className="flex-1 min-w-0 text-xs font-mono px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                />
                <button
                  onClick={copy}
                  className={`shrink-0 flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold shadow-sm transition-all active:scale-95 cursor-pointer ${
                    copied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-100'
                  }`}
                >
                  {copied ? <Check size={14} weight="bold" /> : <Copy size={14} weight="bold" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>

              <p className="mt-3 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                This is a snapshot of the flow as it looks now. Re-open Share after edits to refresh
                it — the link stays the same.
              </p>

              <div className="mt-4 flex items-center justify-end">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 transition-colors"
                >
                  Open viewer <ArrowSquareOut size={14} weight="bold" />
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
