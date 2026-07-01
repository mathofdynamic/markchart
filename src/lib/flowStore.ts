/**
 * Single source of truth for the locally-persisted flow list.
 *
 * Every read tolerates missing/corrupt storage, and every write is guarded so a
 * failing `localStorage` (Safari private mode, quota exceeded, storage disabled)
 * degrades gracefully instead of throwing an uncaught exception mid-edit —
 * matching the pattern already used by shareStore.ts / promptHistory.ts.
 */
import { Flow } from '../types';

const STORAGE_KEY = 'markchart_flows';

/** Load the persisted flow list; returns [] on missing or unparseable storage. */
export function loadSavedFlows(): Flow[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Flow[]) : [];
  } catch (err) {
    console.error('Failed to read saved flows from localStorage:', err);
    return [];
  }
}

/** Persist the flow list. Returns false (without throwing) if storage rejects it. */
export function saveSavedFlows(flows: Flow[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(flows));
    return true;
  } catch (err) {
    console.error('Failed to persist saved flows to localStorage:', err);
    return false;
  }
}
