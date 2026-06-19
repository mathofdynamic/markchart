import { Env, json, getApiUser } from '../../../_lib';
import { Flow } from '../../../_flow';

/** GET /api/v1/flows  (API-key-authed) — list the key owner's flows. */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getApiUser(request, env);
  if (!user) return json({ error: 'Invalid or missing API key.' }, { status: 401 });

  const { results } = await env.DB.prepare(
    `SELECT id, title, description, icon, data, updated_at
     FROM flows WHERE user_sub = ? ORDER BY updated_at DESC`,
  )
    .bind(user.sub)
    .all();

  const flows = (results || []).map((r: any) => {
    let data: any = {};
    try {
      data = JSON.parse(r.data || '{}');
    } catch {
      data = {};
    }
    return {
      id: r.id,
      title: r.title || 'Untitled Flow',
      description: r.description || '',
      icon: r.icon || 'TreeStructure',
      updated_at: r.updated_at,
      nodes: data.nodes || [],
      edges: data.edges || [],
    };
  });

  return json({ flows });
};

/**
 * POST /api/v1/flows  (API-key-authed) — create or update a flow.
 * Body: { id?, title?, description?, icon?, nodes: [...], edges: [...] }
 * If `id` is omitted a new one is generated. Returns the stored flow.
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getApiUser(request, env);
  if (!user) return json({ error: 'Invalid or missing API key.' }, { status: 401 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (!Array.isArray(body?.nodes)) {
    return json({ error: 'Body must include a "nodes" array.' }, { status: 400 });
  }

  const flow: Flow = {
    id: String(body.id || `flow_${Date.now()}`),
    title: String(body.title || 'Untitled Flow').slice(0, 120),
    description: String(body.description || '').slice(0, 500),
    icon: String(body.icon || 'TreeStructure'),
    nodes: body.nodes,
    edges: Array.isArray(body.edges) ? body.edges : [],
  };

  const data = JSON.stringify({ nodes: flow.nodes, edges: flow.edges });

  await env.DB.prepare(
    `INSERT INTO flows (id, user_sub, title, description, icon, data, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       title = excluded.title,
       description = excluded.description,
       icon = excluded.icon,
       data = excluded.data,
       updated_at = excluded.updated_at
     WHERE flows.user_sub = excluded.user_sub`,
  )
    .bind(flow.id, user.sub, flow.title, flow.description, flow.icon, data, Date.now())
    .run();

  return json({ flow });
};
