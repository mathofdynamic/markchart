import { Env, json, getUser } from '../../_lib';
import { runFlowGeneration } from '../../_ai';

/**
 * POST /api/ai/generate  (session-authed, used by the web app)
 *
 * Body: { prompt: string } → normalized flow graph { title, description, nodes, edges }.
 * The heavy lifting lives in functions/_ai.ts (shared with /api/v1/generate).
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  // Workers AI bills per call, so generation is gated to signed-in users.
  const user = await getUser(request, env);
  if (!user) {
    return json({ error: 'Please sign in with Google to generate flows with AI.' }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const result = await runFlowGeneration(env, body?.prompt);
  if (!result.ok) {
    return json({ error: result.error }, { status: result.status });
  }
  return json(result.graph);
};
