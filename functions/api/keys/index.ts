import { Env, json, getUser, sha256Hex, generateApiKey } from '../../_lib';

/** GET /api/keys — list the signed-in user's API keys (metadata only, no secrets). */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getUser(request, env);
  if (!user) return json({ error: 'unauthorized' }, { status: 401 });

  const { results } = await env.DB.prepare(
    `SELECT id, name, prefix, created_at, last_used_at
     FROM api_keys WHERE user_sub = ? ORDER BY created_at DESC`,
  )
    .bind(user.sub)
    .all();

  return json(results || []);
};

/**
 * POST /api/keys — create a new API key for the signed-in user.
 * Body: { name?: string }. Returns the full secret key ONCE (never retrievable again).
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getUser(request, env);
  if (!user) return json({ error: 'unauthorized' }, { status: 401 });

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    // empty body is fine
  }

  // Cap keys per user to keep things sane.
  const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM api_keys WHERE user_sub = ?')
    .bind(user.sub)
    .first<{ n: number }>();
  if ((count?.n ?? 0) >= 10) {
    return json({ error: 'You have reached the maximum of 10 API keys. Delete one first.' }, { status: 400 });
  }

  const name = String(body?.name ?? '').slice(0, 60).trim() || 'API key';
  const key = generateApiKey();
  const id = crypto.randomUUID();
  const prefix = `${key.slice(0, 12)}…`;
  const keyHash = await sha256Hex(key);
  const now = Date.now();

  await env.DB.prepare(
    `INSERT INTO api_keys (id, user_sub, name, key_hash, prefix, created_at, last_used_at)
     VALUES (?, ?, ?, ?, ?, ?, NULL)`,
  )
    .bind(id, user.sub, name, keyHash, prefix, now)
    .run();

  // `key` is returned exactly once — the client must copy it now.
  return json({ id, name, prefix, created_at: now, key });
};
