import { Env, json, clearSessionCookie } from '../../_lib';

export const onRequestPost: PagesFunction<Env> = async () => {
  return json({ ok: true }, { headers: { 'Set-Cookie': clearSessionCookie() } });
};
