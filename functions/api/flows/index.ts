import { Env, json, getUser } from '../../_lib';

/** List the signed-in user's cloud flows. */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getUser(request, env);
  if (!user) return json({ error: 'unauthorized' }, { status: 401 });

  const { results } = await env.DB.prepare(
    `SELECT id, title, description, icon, data
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
      nodes: data.nodes || [],
      edges: data.edges || [],
    };
  });

  return json(flows);
};

/** Create or update one of the signed-in user's cloud flows. */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getUser(request, env);
  if (!user) return json({ error: 'unauthorized' }, { status: 401 });

  let flow: any;
  try {
    flow = await request.json();
  } catch {
    return json({ error: 'bad request' }, { status: 400 });
  }
  if (!flow?.id) return json({ error: 'missing flow id' }, { status: 400 });

  const data = JSON.stringify({ nodes: flow.nodes || [], edges: flow.edges || [] });

  const result = await env.DB.prepare(
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
    .bind(
      flow.id,
      user.sub,
      flow.title || 'Untitled Flow',
      flow.description || '',
      flow.icon || 'TreeStructure',
      data,
      Date.now(),
    )
    .run();

  // An id already owned by a different user makes the guarded upsert a silent
  // no-op (0 rows changed); report a conflict rather than a false success.
  if (!result.meta?.changes) {
    return json({ error: 'conflict: flow id owned by another account' }, { status: 409 });
  }

  return json({ ok: true });
};
