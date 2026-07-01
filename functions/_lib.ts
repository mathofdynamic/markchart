/**
 * Shared helpers for MarkChart Pages Functions.
 * Files prefixed with "_" are not turned into routes by Pages.
 */

export interface Env {
  DB: D1Database;
  SESSION_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  // Workers AI binding (configured as `[ai] binding = "AI"` in wrangler.toml).
  // Typed structurally so we don't depend on @cloudflare/workers-types' `Ai`.
  AI: {
    run: (
      model: string,
      inputs: Record<string, unknown>,
      options?: Record<string, unknown>,
    ) => Promise<any>;
  };
}

export interface SessionUser {
  sub: string;
  email: string;
  name: string;
  picture: string;
}

export const SESSION_COOKIE = 'mc_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

const encoder = new TextEncoder();

function b64urlEncode(data: ArrayBuffer | Uint8Array | string): string {
  let bytes: Uint8Array;
  if (typeof data === 'string') bytes = encoder.encode(data);
  else if (data instanceof Uint8Array) bytes = data;
  else bytes = new Uint8Array(data);
  let str = '';
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecodeToString(s: string): string {
  let t = s.replace(/-/g, '+').replace(/_/g, '/');
  while (t.length % 4) t += '=';
  return atob(t);
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

export async function signSession(user: SessionUser, secret: string): Promise<string> {
  const header = b64urlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;
  const payload = b64urlEncode(JSON.stringify({ ...user, exp }));
  const data = `${header}.${payload}`;
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return `${data}.${b64urlEncode(sig)}`;
}

export async function verifySession(token: string, secret: string): Promise<SessionUser | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, payload, sig] = parts;
  const key = await hmacKey(secret);
  const expected = b64urlEncode(
    await crypto.subtle.sign('HMAC', key, encoder.encode(`${header}.${payload}`)),
  );
  if (expected !== sig) return null;
  try {
    const claims = JSON.parse(b64urlDecodeToString(payload));
    if (!claims.exp || claims.exp < Math.floor(Date.now() / 1000)) return null;
    return {
      sub: claims.sub,
      email: claims.email,
      name: claims.name,
      picture: claims.picture,
    };
  } catch {
    return null;
  }
}

export function sessionCookie(value: string): string {
  return `${SESSION_COOKIE}=${value}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_MAX_AGE}`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.get('Cookie') || '';
  const out: Record<string, string> = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx > -1) {
      const k = part.slice(0, idx).trim();
      if (k) out[k] = decodeURIComponent(part.slice(idx + 1).trim());
    }
  }
  return out;
}

export async function getUser(req: Request, env: Env): Promise<SessionUser | null> {
  const token = parseCookies(req)[SESSION_COOKIE];
  if (!token) return null;
  return verifySession(token, env.SESSION_SECRET);
}

export function json(data: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
}

// ---------------------------------------------------------------------------
// API keys — for programmatic access to /api/v1/* with `Authorization: Bearer`.
// ---------------------------------------------------------------------------

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(input));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Random url-safe base64 string from `bytes` bytes of entropy. */
function randomB64url(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  let str = '';
  for (let i = 0; i < arr.length; i++) str += String.fromCharCode(arr[i]);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Generate a fresh secret API key, e.g. "mk_live_xK3...". */
export function generateApiKey(): string {
  return `mk_live_${randomB64url(24)}`;
}

/** Short, url-safe public id for a shared flow (used in /s/<token>). */
export function generateShareToken(): string {
  return randomB64url(8); // ~11 chars
}

/** Secret that proves the right to update an existing share under its token. */
export function generateEditSecret(): string {
  return randomB64url(24);
}

/**
 * Resolve the user behind an `Authorization: Bearer <key>` header by matching
 * the key's SHA-256 hash against the api_keys table. Returns the user's sub, or
 * null if missing/invalid. Updates last_used_at on success (best-effort).
 */
export async function getApiUser(req: Request, env: Env): Promise<{ sub: string } | null> {
  const auth = req.headers.get('Authorization') || '';
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  const key = match[1].trim();
  if (!key) return null;

  const hash = await sha256Hex(key);
  const row = await env.DB.prepare('SELECT user_sub FROM api_keys WHERE key_hash = ?')
    .bind(hash)
    .first<{ user_sub: string }>();
  if (!row) return null;

  try {
    await env.DB.prepare('UPDATE api_keys SET last_used_at = ? WHERE key_hash = ?')
      .bind(Date.now(), hash)
      .run();
  } catch {
    // non-fatal
  }

  return { sub: row.user_sub };
}
