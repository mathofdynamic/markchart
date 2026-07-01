import { Env, json, getUser } from '../../_lib';
import { reviewProcess } from '../../_ai';

/**
 * POST /api/ai/review  (session-authed, used by the web app)
 *
 * Body: { prompt: string } → { issues: string[], refined: string }.
 * Audits a process description for logical gaps before it's turned into a flow.
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  // Workers AI bills per call, so review is gated to signed-in users.
  const user = await getUser(request, env);
  if (!user) {
    return json({ error: 'Please sign in with Google to use AI.' }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const result = await reviewProcess(env, body?.prompt);
  if (!result.ok) {
    return json({ error: result.error }, { status: result.status });
  }
  return json(result.review);
};
