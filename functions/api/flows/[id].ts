import { Env, json, getUser } from '../../_lib';

/** Delete one of the signed-in user's cloud flows. */
export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  const user = await getUser(request, env);
  if (!user) return json({ error: 'unauthorized' }, { status: 401 });

  const id = String(params.id);
  await env.DB.prepare(`DELETE FROM flows WHERE id = ? AND user_sub = ?`)
    .bind(id, user.sub)
    .run();

  return json({ ok: true });
};
