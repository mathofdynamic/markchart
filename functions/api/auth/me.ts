import { Env, json, getUser } from '../../_lib';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getUser(request, env);
  if (!user) return json({ error: 'unauthorized' }, { status: 401 });
  return json(user);
};
