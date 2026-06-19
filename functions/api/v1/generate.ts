import { Env, json, getApiUser } from '../../_lib';
import { runFlowGeneration } from '../../_ai';
import { graphToFlow, flowExports } from '../../_flow';

/**
 * POST /api/v1/generate  (API-key-authed)
 *
 * Headers: Authorization: Bearer <api-key>
 * Body:    { "prompt": string, "save"?: boolean }
 * Returns: { flow, markdown, mermaid, saved }
 *   - flow: the laid-out flow (id, title, description, nodes[], edges[])
 *   - markdown / mermaid: the two AI-friendly text exports
 *   - if save=true, the flow is persisted to the key owner's account
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getApiUser(request, env);
  if (!user) {
    return json(
      { error: 'Invalid or missing API key. Send it as: Authorization: Bearer <key>' },
      { status: 401 },
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const result = await runFlowGeneration(env, body?.prompt);
  if (!result.ok) {
    return json({ error: result.error }, { status: result.status });
  }

  const flow = graphToFlow(result.graph, `flow_${Date.now()}`);
  const { markdown, mermaid } = flowExports(flow);

  let saved = false;
  if (body?.save === true) {
    const data = JSON.stringify({ nodes: flow.nodes, edges: flow.edges });
    await env.DB.prepare(
      `INSERT INTO flows (id, user_sub, title, description, icon, data, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(flow.id, user.sub, flow.title, flow.description, flow.icon || 'FlowArrow', data, Date.now())
      .run();
    saved = true;
  }

  return json({ flow, markdown, mermaid, saved });
};
