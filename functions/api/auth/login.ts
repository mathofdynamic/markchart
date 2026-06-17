import { Env, SessionUser, json, signSession, sessionCookie } from '../../_lib';

/**
 * Verify a Google ID token (via Google's tokeninfo endpoint), upsert the user,
 * and issue our own HttpOnly session cookie.
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: { credential?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'bad request' }, { status: 400 });
  }

  const credential = body?.credential;
  if (!credential) return json({ error: 'missing credential' }, { status: 400 });

  const resp = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`,
  );
  if (!resp.ok) return json({ error: 'invalid token' }, { status: 401 });

  const info: any = await resp.json();

  if (info.aud !== env.GOOGLE_CLIENT_ID) {
    return json({ error: 'audience mismatch' }, { status: 401 });
  }
  if (info.iss !== 'accounts.google.com' && info.iss !== 'https://accounts.google.com') {
    return json({ error: 'issuer mismatch' }, { status: 401 });
  }
  if (Number(info.exp) < Math.floor(Date.now() / 1000)) {
    return json({ error: 'token expired' }, { status: 401 });
  }

  const user: SessionUser = {
    sub: info.sub,
    email: info.email || '',
    name: info.name || info.email || 'User',
    picture: info.picture || '',
  };

  await env.DB.prepare(
    `INSERT INTO users (sub, email, name, picture, created_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(sub) DO UPDATE SET
       email = excluded.email,
       name = excluded.name,
       picture = excluded.picture`,
  )
    .bind(user.sub, user.email, user.name, user.picture, Date.now())
    .run();

  const token = await signSession(user, env.SESSION_SECRET);
  return json(user, { headers: { 'Set-Cookie': sessionCookie(token) } });
};
