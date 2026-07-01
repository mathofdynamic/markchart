import { Env, json, getUser, generateShareToken, generateEditSecret, timingSafeEqual } from '../../_lib';

// Hard cap on the serialized snapshot so a single share can't bloat the table.
const MAX_DATA = 300_000;

/**
 * Create — or, with a valid token + edit_secret, update — a public share
 * snapshot of a flow. Open to everyone (the app is anonymous-first); when the
 * caller is signed in we record their sub as the owner for reference.
 *
 * Body: { flowId?, token?, editSecret?, title, description, icon, nodes, edges }
 * Returns: { token, editSecret? }  (editSecret only on first creation)
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'bad request' }, { status: 400 });
  }

  const nodes = Array.isArray(body?.nodes) ? body.nodes : null;
  const edges = Array.isArray(body?.edges) ? body.edges : null;
  if (!nodes || !edges) return json({ error: 'missing nodes/edges' }, { status: 400 });
  if (nodes.length === 0) return json({ error: 'Cannot share an empty flow.' }, { status: 400 });

  const data = JSON.stringify({ nodes, edges });
  if (data.length > MAX_DATA) {
    return json({ error: 'This flow is too large to share.' }, { status: 413 });
  }

  const title = typeof body.title === 'string' ? body.title.slice(0, 200) : 'Untitled Flow';
  const description = typeof body.description === 'string' ? body.description.slice(0, 500) : '';
  const icon = typeof body.icon === 'string' ? body.icon.slice(0, 40) : 'TreeStructure';
  const flowId = typeof body.flowId === 'string' ? body.flowId.slice(0, 80) : null;

  const user = await getUser(request, env);
  const now = Date.now();

  // Update path: the caller proves ownership of an existing share.
  if (typeof body.token === 'string' && typeof body.editSecret === 'string') {
    const row = await env.DB.prepare('SELECT edit_secret FROM shares WHERE token = ?')
      .bind(body.token)
      .first<{ edit_secret: string }>();
    if (row && timingSafeEqual(row.edit_secret, body.editSecret)) {
      await env.DB.prepare(
        `UPDATE shares SET title = ?, description = ?, icon = ?, data = ?, updated_at = ?
         WHERE token = ?`,
      )
        .bind(title, description, icon, data, now, body.token)
        .run();
      return json({ token: body.token });
    }
    // Token/secret didn't match (e.g. share was deleted) — fall through to create a fresh one.
  }

  const token = generateShareToken();
  const editSecret = generateEditSecret();
  await env.DB.prepare(
    `INSERT INTO shares
       (token, edit_secret, owner_sub, flow_id, title, description, icon, data, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(token, editSecret, user?.sub || null, flowId, title, description, icon, data, now, now)
    .run();

  return json({ token, editSecret });
};
