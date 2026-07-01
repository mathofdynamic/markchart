import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Key,
  Plus,
  Trash,
  Copy,
  Check,
  Warning,
  CircleNotch,
  Terminal,
} from '@phosphor-icons/react';
import { ApiKey, fetchApiKeys, createApiKey, deleteApiKey } from '../lib/api';
import { useFocusTrap } from '../lib/useFocusTrap';

interface SettingsModalProps {
  onClose: () => void;
  onToast: (message: string, type?: 'success' | 'info' | 'warning') => void;
}

function formatDate(ts: number | null): string {
  if (!ts) return 'never';
  try {
    return new Date(ts).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return '—';
  }
}

export default function SettingsModal({ onClose, onToast }: SettingsModalProps) {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [justCreated, setJustCreated] = useState<{ name: string; key: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const dialogRef = useFocusTrap<HTMLDivElement>();

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://markchart.pages.dev';

  const load = () => {
    setLoading(true);
    fetchApiKeys()
      .then((k) => {
        setKeys(k);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load keys'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !creating) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [creating, onClose]);

  const handleCreate = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const created = await createApiKey(name.trim() || 'API key');
      setJustCreated({ name: created.name, key: created.key });
      setName('');
      setCopied(false);
      load();
    } catch (e) {
      onToast(e instanceof Error ? e.message : 'Could not create key', 'warning');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await deleteApiKey(id);
      setKeys((prev) => prev.filter((k) => k.id !== id));
      onToast('API key revoked.', 'info');
    } catch (e) {
      onToast(e instanceof Error ? e.message : 'Could not revoke key', 'warning');
    }
  };

  const copyKey = async () => {
    if (!justCreated) return;
    try {
      await navigator.clipboard.writeText(justCreated.key);
      setCopied(true);
      onToast('API key copied to clipboard.', 'success');
    } catch {
      onToast('Copy failed — select and copy it manually.', 'warning');
    }
  };

  const curlExample = `curl -X POST ${baseUrl}/api/v1/generate \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"prompt":"When an order arrives, check stock; if available, charge and ship; otherwise notify the customer."}'`;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-[8vh] bg-zinc-950/40 dark:bg-zinc-950/60 backdrop-blur-sm animate-in fade-in duration-150"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !creating) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
        tabIndex={-1}
        className="w-full max-w-2xl max-h-[84vh] flex flex-col rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-top-2 duration-200 focus:outline-none"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-4 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-950 shadow-md">
              <Key size={20} weight="fill" />
            </div>
            <div>
              <h2 id="settings-modal-title" className="text-sm font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
                API Keys & Settings
              </h2>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                Use MarkChart programmatically — generate flows and pull Markdown / Mermaid.
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

        {/* Body (scrolls) */}
        <div className="px-5 py-4 overflow-y-auto">
          {/* Create */}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label htmlFor="settings-key-name" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                Create a new key
              </label>
              <input
                id="settings-key-name"
                ref={nameRef}
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 60))}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                placeholder="Key name (e.g. “local testing”)"
                className="mt-1 w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950/50 px-3 py-2 text-sm text-zinc-800 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all"
              />
            </div>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer h-[38px]"
            >
              {creating ? <CircleNotch size={14} weight="bold" className="animate-spin" /> : <Plus size={14} weight="bold" />}
              Generate
            </button>
          </div>

          {/* Just-created key (shown once) */}
          {justCreated && (
            <div className="mt-3 rounded-xl border border-emerald-300 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/20 p-3">
              <div className="flex items-center gap-2 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                <Warning size={14} weight="fill" />
                Copy this key now — it won’t be shown again.
              </div>
              <div className="mt-2 flex items-center gap-2">
                <code className="flex-1 truncate rounded-lg bg-white dark:bg-zinc-950 border border-emerald-200 dark:border-emerald-900/40 px-2.5 py-1.5 text-[11px] font-mono text-zinc-800 dark:text-zinc-100">
                  {justCreated.key}
                </code>
                <button
                  onClick={copyKey}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-all active:scale-95 cursor-pointer"
                >
                  {copied ? <Check size={13} weight="bold" /> : <Copy size={13} weight="bold" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          )}

          {/* Key list */}
          <div className="mt-5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2">
              Your keys
            </div>

            {loading ? (
              <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 py-4">
                <CircleNotch size={14} weight="bold" className="animate-spin" />
                Loading…
              </div>
            ) : error ? (
              <div className="flex items-center gap-2 rounded-lg border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/20 px-3 py-2 text-[11px] font-medium text-rose-700 dark:text-rose-300">
                <Warning size={14} weight="fill" /> {error}
              </div>
            ) : keys.length === 0 ? (
              <div className="rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800 px-3 py-5 text-center text-xs text-zinc-400 dark:text-zinc-500">
                No API keys yet. Generate one above to start using the API.
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {keys.map((k) => (
                  <div
                    key={k.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/40 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-800 dark:text-zinc-100 truncate">{k.name}</span>
                        <code className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">{k.prefix}</code>
                      </div>
                      <div className="text-[10px] text-zinc-400 dark:text-zinc-500">
                        Created {formatDate(k.created_at)} · Last used {formatDate(k.last_used_at)}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRevoke(k.id)}
                      className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
                      title="Revoke this key"
                    >
                      <Trash size={13} weight="bold" /> Revoke
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quickstart */}
          <div className="mt-5">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2">
              <Terminal size={12} weight="bold" /> Quickstart
            </div>
            <pre className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-950 dark:bg-black text-zinc-100 text-[10.5px] leading-relaxed p-3 overflow-x-auto no-scrollbar font-mono whitespace-pre">
{curlExample}
            </pre>
            <p className="mt-2 text-[10.5px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Endpoints: <code className="font-mono text-zinc-600 dark:text-zinc-300">POST /api/v1/generate</code>,{' '}
              <code className="font-mono text-zinc-600 dark:text-zinc-300">GET/POST /api/v1/flows</code>,{' '}
              <code className="font-mono text-zinc-600 dark:text-zinc-300">GET/DELETE /api/v1/flows/:id</code>. Add{' '}
              <code className="font-mono text-zinc-600 dark:text-zinc-300">?format=markdown</code> or{' '}
              <code className="font-mono text-zinc-600 dark:text-zinc-300">?format=mermaid</code> to a flow URL for raw text.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
