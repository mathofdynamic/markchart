/**
 * Remembers the share token + edit secret for each flow the user has shared,
 * so re-sharing the same flow reuses (and updates) the existing public link
 * instead of minting a brand-new one each time. Kept in localStorage, keyed by
 * flow id. The edit secret never leaves this browser except to authorize an
 * update of that flow's own share.
 */

const SHARES_KEY = 'markchart_shares';

export interface ShareRef {
  token: string;
  editSecret: string;
}

function loadAll(): Record<string, ShareRef> {
  try {
    const raw = localStorage.getItem(SHARES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function loadShareRef(flowId: string): ShareRef | null {
  if (!flowId) return null;
  const ref = loadAll()[flowId];
  return ref && typeof ref.token === 'string' && typeof ref.editSecret === 'string' ? ref : null;
}

export function saveShareRef(flowId: string, ref: ShareRef): void {
  if (!flowId) return;
  const all = loadAll();
  all[flowId] = ref;
  try {
    localStorage.setItem(SHARES_KEY, JSON.stringify(all));
  } catch {
    // ignore quota / serialization errors
  }
}
