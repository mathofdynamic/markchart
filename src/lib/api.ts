/**
 * Cloud flow API client. All requests rely on the HttpOnly session cookie
 * set during sign-in, so they must send credentials.
 */
import { Flow } from '../types';

export async function fetchCloudFlows(): Promise<Flow[]> {
  const res = await fetch('/api/flows', { credentials: 'include' });
  if (!res.ok) throw new Error(`Failed to load cloud flows (${res.status})`);
  return (await res.json()) as Flow[];
}

export async function saveCloudFlow(flow: Flow): Promise<void> {
  const res = await fetch('/api/flows', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(flow),
  });
  if (!res.ok) throw new Error(`Failed to save flow to cloud (${res.status})`);
}

export async function deleteCloudFlow(id: string): Promise<void> {
  const res = await fetch(`/api/flows/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`Failed to delete cloud flow (${res.status})`);
}
