/**
 * Cloud flow API client. All requests rely on the HttpOnly session cookie
 * set during sign-in, so they must send credentials.
 */
import { Flow, GeneratedGraph } from '../types';

/**
 * Ask the AI endpoint (Cloudflare Workers AI / Gemma) to turn a plain-language
 * description into a logical flow graph. No auth required.
 */
export async function generateFlow(prompt: string): Promise<GeneratedGraph> {
  const res = await fetch('/api/ai/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) {
    let message = `Generation failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      // keep the default message
    }
    throw new Error(message);
  }
  return (await res.json()) as GeneratedGraph;
}

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

// --- API keys (programmatic access to /api/v1/*) ---------------------------

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  created_at: number;
  last_used_at: number | null;
}

export async function fetchApiKeys(): Promise<ApiKey[]> {
  const res = await fetch('/api/keys', { credentials: 'include' });
  if (!res.ok) throw new Error(`Failed to load API keys (${res.status})`);
  return (await res.json()) as ApiKey[];
}

/** Create a key; the returned `key` is the full secret, shown only this once. */
export async function createApiKey(name: string): Promise<ApiKey & { key: string }> {
  const res = await fetch('/api/keys', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    let message = `Failed to create API key (${res.status})`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      // keep default
    }
    throw new Error(message);
  }
  return (await res.json()) as ApiKey & { key: string };
}

export async function deleteApiKey(id: string): Promise<void> {
  const res = await fetch(`/api/keys/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`Failed to revoke API key (${res.status})`);
}
