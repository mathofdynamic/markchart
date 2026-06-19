import { Env, json, getUser } from '../../_lib';

/** DELETE /api/keys/:id — revoke one of the signed-in user's API keys. */
export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  const user = await getUser(request, env);
  if (!user) return json({ error: 'unauthorized' }, { status: 401 });

  const id = String(params.id || '');
  if (!id) return json({ error: 'missing key id' }, { status: 400 });

  await env.DB.prepare('DELETE FROM api_keys WHERE id = ? AND user_sub = ?')
    .bind(id, user.sub)
    .run();

  return json({ ok: true });
};
