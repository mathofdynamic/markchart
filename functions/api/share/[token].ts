import { Env, json } from '../../_lib';

/**
 * Public, unauthenticated read of a shared flow snapshot. Returns only the
 * fields needed to render it read-only; the edit_secret is never exposed.
 */
export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const token = String(params.token);

  const row = await env.DB.prepare(
    'SELECT title, description, icon, data, updated_at FROM shares WHERE token = ?',
  )
    .bind(token)
    .first<any>();

  if (!row) return json({ error: 'not found' }, { status: 404 });

  let data: any = {};
  try {
    data = JSON.parse(row.data || '{}');
  } catch {
    data = {};
  }

  return json(
    {
      title: row.title || 'Untitled Flow',
      description: row.description || '',
      icon: row.icon || 'TreeStructure',
      nodes: data.nodes || [],
      edges: data.edges || [],
      updatedAt: row.updated_at || null,
    },
    { headers: { 'Cache-Control': 'public, max-age=30' } },
  );
};
