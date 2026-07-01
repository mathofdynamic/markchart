/**
 * Recent AI prompt history, persisted in localStorage. A plain string[] kept
 * newest-first, de-duplicated case-insensitively, and capped. Used by the
 * "Generate with AI" modal's Recent list.
 */

const HISTORY_KEY = 'markchart_ai_history';
const MAX_HISTORY = 15;

export function loadHistory(): string[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((p): p is string => typeof p === 'string' && p.trim().length > 0);
  } catch {
    return [];
  }
}

function persist(list: string[]): string[] {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
  } catch {
    // ignore quota / serialization errors
  }
  return list;
}

/** Add a prompt to the front (most-recent-first), de-duping and capping. */
export function addToHistory(prompt: string): string[] {
  const trimmed = prompt.trim();
  if (!trimmed) return loadHistory();
  const existing = loadHistory().filter((p) => p.toLowerCase() !== trimmed.toLowerCase());
  return persist([trimmed, ...existing].slice(0, MAX_HISTORY));
}

export function removeFromHistory(prompt: string): string[] {
  const next = loadHistory().filter((p) => p !== prompt);
  return persist(next);
}

export function clearHistory(): string[] {
  return persist([]);
}

// ---------------------------------------------------------------------------
// Per-flow prompt history — the prompt(s) that produced a specific flow, keyed
// by flow id. Lets the AI modal show "prompts used for this flow".
// ---------------------------------------------------------------------------

const FLOW_PROMPTS_KEY = 'markchart_flow_prompts';
const MAX_FLOW_PROMPTS = 8;

function loadAllFlowPrompts(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(FLOW_PROMPTS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function persistAllFlowPrompts(all: Record<string, string[]>): void {
  try {
    localStorage.setItem(FLOW_PROMPTS_KEY, JSON.stringify(all));
  } catch {
    // ignore
  }
}

export function loadFlowPrompts(flowId: string): string[] {
  if (!flowId) return [];
  const list = loadAllFlowPrompts()[flowId];
  return Array.isArray(list)
    ? list.filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
    : [];
}

/** Record the prompt that produced a given flow (newest-first, de-duped, capped). */
export function addFlowPrompt(flowId: string, prompt: string): string[] {
  const trimmed = prompt.trim();
  if (!flowId || !trimmed) return loadFlowPrompts(flowId);
  const all = loadAllFlowPrompts();
  const existing = (Array.isArray(all[flowId]) ? all[flowId] : []).filter(
    (p) => p.toLowerCase() !== trimmed.toLowerCase(),
  );
  all[flowId] = [trimmed, ...existing].slice(0, MAX_FLOW_PROMPTS);
  persistAllFlowPrompts(all);
  return all[flowId];
}

export function removeFlowPrompt(flowId: string, prompt: string): string[] {
  const all = loadAllFlowPrompts();
  if (!Array.isArray(all[flowId])) return [];
  all[flowId] = all[flowId].filter((p) => p !== prompt);
  persistAllFlowPrompts(all);
  return all[flowId];
}
