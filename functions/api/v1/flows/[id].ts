import { Env, json, getApiUser } from '../../../_lib';
import { Flow, flowExports } from '../../../_flow';

/**
 * GET /api/v1/flows/:id  (API-key-authed)
 * Returns the flow plus its Markdown and Mermaid exports.
 * Add ?format=markdown or ?format=mermaid to get the raw text instead of JSON.
 */
export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const user = await getApiUser(request, env);
  if (!user) return json({ error: 'Invalid or missing API key.' }, { status: 401 });

  const id = String(params.id || '');
  const row = await env.DB.prepare(
    `SELECT id, title, description, icon, data FROM flows WHERE id = ? AND user_sub = ?`,
  )
    .bind(id, user.sub)
    .first<any>();

  if (!row) return json({ error: 'Flow not found.' }, { status: 404 });

  let data: any = {};
  try {
    data = JSON.parse(row.data || '{}');
  } catch {
    data = {};
  }

  const flow: Flow = {
    id: row.id,
    title: row.title || 'Untitled Flow',
    description: row.description || '',
    icon: row.icon || 'TreeStructure',
    nodes: data.nodes || [],
    edges: data.edges || [],
  };

  const { markdown, mermaid } = flowExports(flow);

  const format = new URL(request.url).searchParams.get('format');
  if (format === 'markdown') {
    return new Response(markdown, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
  }
  if (format === 'mermaid') {
    return new Response(mermaid, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }

  return json({ flow, markdown, mermaid });
};

/** DELETE /api/v1/flows/:id  (API-key-authed) */
export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  const user = await getApiUser(request, env);
  if (!user) return json({ error: 'Invalid or missing API key.' }, { status: 401 });

  const id = String(params.id || '');
  if (!id) return json({ error: 'missing flow id' }, { status: 400 });

  await env.DB.prepare('DELETE FROM flows WHERE id = ? AND user_sub = ?').bind(id, user.sub).run();
  return json({ ok: true });
};
