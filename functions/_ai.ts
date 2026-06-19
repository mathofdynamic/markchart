import { Env } from './_lib';

/**
 * Shared AI flow-generation logic used by both:
 *   - /api/ai/generate     (session-authed, from the web app)
 *   - /api/v1/generate     (API-key-authed, programmatic)
 *
 * Uses Cloudflare Workers AI — a Gemma-family instruct model. We constrain it
 * with a strict system prompt and defensively parse/validate the JSON it returns
 * (these models don't reliably honor `guided_json`, and reasoning variants like
 * gemma-4 are too slow synchronously — they hit the ~60s gateway timeout).
 * Model returns the OpenAI chat shape: choices[0].message.content.
 *
 * Model notes (Workers AI, as of 2026-06):
 *   - @cf/google/gemma-3-12b-it ....... DEPRECATED 2026-05-30 (errors).
 *   - @cf/google/gemma-4-26b-a4b-it ... reasoning model, ~60s -> 504. Avoid.
 *   - @cf/aisingapore/gemma-sea-lion-v4-27b-it ... Gemma-based, ~11s, reliable. ✅
 */

export const AI_MODEL = '@cf/aisingapore/gemma-sea-lion-v4-27b-it';

export const NODE_TYPES = ['start', 'end', 'process', 'decision', 'loop', 'io', 'note'] as const;

export interface GraphNode {
  id: string;
  type: string;
  label: string;
  description?: string;
}
export interface GraphEdge {
  source: string;
  target: string;
  label?: string;
}
export interface FlowGraph {
  title: string;
  description: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

const SYSTEM_PROMPT = `You are MarkChart's flowchart architect. You convert a user's plain-language description of a process, algorithm, or decision into a STRUCTURED FLOWCHART GRAPH made of nodes and edges. Your output is consumed by software, not read by a human, so it MUST be a single valid JSON object with the exact shape shown in the example below. Output JSON only — no prose, no explanation, no markdown, no code fences.

OUTPUT SHAPE: { "title": string, "description": string, "nodes": [{ "id": string, "type": string, "label": string, "description"?: string }], "edges": [{ "source": string, "target": string, "label"?: string }] }

NODE TYPES — use each one precisely:
- "start": the single entry point. Use EXACTLY ONE. Label it with what kicks the process off (e.g. "User submits login form").
- "end": a terminal/exit point. Use at least one; use several when there are distinct outcomes (e.g. a success end and a failure end).
- "process": a concrete action that DOES something ("Validate payload", "Charge credit card", "Send email"). A process has EXACTLY ONE outgoing edge — it never branches.
- "decision": a conditional branch — the ONLY node type (besides loop) allowed to split into multiple paths. It MUST have 2 or more outgoing edges, and EVERY one of those edges MUST carry a non-empty label naming the branch outcome ("Yes", "No", "Valid", "Expired", "In stock").
- "loop": a repetition / retry construct. It typically has one outgoing edge that goes BACK to an earlier node; label that edge with the loop condition ("until healthy", "while retries < 3", "for each item").
- "io": reading input or writing output / exchanging data ("Read uploaded file", "Return JSON response").
- "note": an optional sticky annotation. Use sparingly. Notes need no connections.

RULES:
1. Every node needs a short, specific, imperative label (3–7 words). Never put step numbers in labels.
2. Give each node a stable unique id: "n1", "n2", "n3", … and reference those EXACT ids in edges.
3. The graph must flow from the single start to one or more ends. Every node except notes must connect: a non-start node needs at least one incoming edge, and a non-end node needs at least one outgoing edge. No orphans, no dead-ends.
4. BRANCHING RULE (critical): only "decision" and "loop" nodes may have more than one outgoing edge. "start", "process", and "io" nodes must have EXACTLY ONE outgoing edge. Whenever the flow splits into multiple paths, the splitting node MUST be a "decision" — if a step both does work AND branches, split it into a process followed by a decision.
5. Every outgoing edge of a "decision" MUST have a short, non-empty label ("Yes", "No", "Valid", "Otherwise", …). A decision needs 2+ outgoing edges; one is INVALID. Never leave a decision branch unlabeled.
6. Model loops/retries with an edge whose target is an EARLIER node, labeled with the loop/retry condition. The "should we retry?" test ("attempts left?", "under 3 tries?") must be a "decision" node, not a "process".
7. Prefer the smallest correct graph. Don't invent steps the user didn't imply — but DO add the obvious start, the end(s), and clear error/failure branches when the description implies them.
8. Put extra context in a node's optional "description" field (one short sentence), never in the label.
9. "title" = a concise name for the whole flow. "description" = one sentence summarizing what it does.

EXAMPLE
User: "When a user logs in, check the password. If it's correct send them to the dashboard. If it's wrong, show an error and let them try again, but lock the account after 3 failed tries."
Output:
{
  "title": "User Login",
  "description": "Authenticates a user and locks the account after repeated failures.",
  "nodes": [
    { "id": "n1", "type": "start", "label": "User submits login" },
    { "id": "n2", "type": "decision", "label": "Password correct?" },
    { "id": "n3", "type": "end", "label": "Go to dashboard" },
    { "id": "n4", "type": "process", "label": "Show error message" },
    { "id": "n5", "type": "decision", "label": "3 failed attempts?" },
    { "id": "n6", "type": "end", "label": "Lock account" }
  ],
  "edges": [
    { "source": "n1", "target": "n2" },
    { "source": "n2", "target": "n3", "label": "Yes" },
    { "source": "n2", "target": "n4", "label": "No" },
    { "source": "n4", "target": "n5" },
    { "source": "n5", "target": "n6", "label": "Yes" },
    { "source": "n5", "target": "n1", "label": "No, retry" }
  ]
}

Return ONLY the JSON object for the user's description.`;

/** Strip ```json fences and surrounding noise. */
function extractJson(text: string): string {
  let t = text.trim();
  if (t.startsWith('```')) {
    t = t.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  }
  return t;
}

/** Coerce raw model output into a clean, validated graph (or null if unusable). */
function normalizeGraph(aiResult: any): FlowGraph | null {
  // These models return the OpenAI chat shape; some older ones return { response }.
  let raw: any;
  if (aiResult && typeof aiResult === 'object') {
    const content = aiResult.choices?.[0]?.message?.content;
    if (typeof content === 'string') raw = content;
    else if (typeof aiResult.response === 'string') raw = aiResult.response;
    else if (content != null) raw = content;
    else if ('response' in aiResult) raw = aiResult.response;
    else raw = aiResult;
  } else {
    raw = aiResult;
  }

  if (typeof raw === 'string') {
    const cleaned = extractJson(raw);
    try {
      raw = JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (!match) return null;
      try {
        raw = JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
  }

  if (!raw || typeof raw !== 'object') return null;

  const rawNodes = Array.isArray(raw.nodes) ? raw.nodes : [];
  const rawEdges = Array.isArray(raw.edges) ? raw.edges : [];
  if (rawNodes.length === 0) return null;

  const nodes: GraphNode[] = rawNodes
    .filter((n: any) => n && n.id != null)
    .map((n: any) => ({
      id: String(n.id),
      type: (NODE_TYPES as readonly string[]).includes(n.type) ? String(n.type) : 'process',
      label: String(n.label ?? '').slice(0, 120),
      description:
        n.description != null && String(n.description).trim()
          ? String(n.description).slice(0, 300)
          : undefined,
    }));

  if (nodes.length === 0) return null;

  const ids = new Set(nodes.map((n) => n.id));
  const edges: GraphEdge[] = rawEdges
    .filter((e: any) => e && ids.has(String(e.source)) && ids.has(String(e.target)))
    .map((e: any) => ({
      source: String(e.source),
      target: String(e.target),
      label: e.label != null && String(e.label).trim() ? String(e.label).slice(0, 60) : undefined,
    }));

  return {
    title: raw.title != null && String(raw.title).trim() ? String(raw.title).slice(0, 120) : 'AI Generated Flow',
    description: raw.description != null ? String(raw.description).slice(0, 300) : '',
    nodes,
    edges,
  };
}

/**
 * Deterministically enforce the structural invariants the model sometimes
 * violates, so output is reliably valid regardless of LLM variance:
 *   - a non-branching node (process/io) with >1 outgoing edge becomes a decision
 *   - a "decision" with <2 outgoing edges is demoted (process, or end if 0 out)
 *   - every decision branch gets a non-empty label
 *   - a non-end node with no outgoing edge becomes an end
 */
function repairGraph(graph: FlowGraph): FlowGraph {
  const outEdges = new Map<string, GraphEdge[]>();
  graph.nodes.forEach((n) => outEdges.set(n.id, []));
  graph.edges.forEach((e) => outEdges.get(e.source)?.push(e));

  const labelPool = ['Yes', 'No', 'Otherwise', 'Option 3', 'Option 4', 'Option 5'];

  for (const n of graph.nodes) {
    const outs = outEdges.get(n.id) || [];

    // A non-decision/loop node that branches is structurally wrong → make it a
    // decision (the only exception is start, which we keep so the flow has one).
    if (outs.length > 1 && (n.type === 'process' || n.type === 'io')) {
      n.type = 'decision';
    }

    // A "decision" that doesn't actually branch isn't a decision.
    if (n.type === 'decision' && outs.length < 2) {
      n.type = outs.length === 0 ? 'end' : 'process';
    }

    // Every branch of a real decision must be labeled.
    if (n.type === 'decision') {
      const used = new Set(outs.map((e) => (e.label || '').trim()).filter(Boolean));
      for (const e of outs) {
        if (!e.label || !e.label.trim()) {
          const next = labelPool.find((l) => !used.has(l)) || 'Otherwise';
          e.label = next;
          used.add(next);
        }
      }
    }

    // A node that goes nowhere (and isn't a note) terminates the flow.
    if (outs.length === 0 && n.type !== 'end' && n.type !== 'note') {
      n.type = 'end';
    }
  }

  return graph;
}

export type GenerationResult =
  | { ok: true; graph: FlowGraph }
  | { ok: false; status: number; error: string };

/** Validate the prompt, call the model, and return a normalized graph. */
export async function runFlowGeneration(env: Env, promptRaw: unknown): Promise<GenerationResult> {
  const prompt = String(promptRaw ?? '').trim();
  if (!prompt) {
    return { ok: false, status: 400, error: 'Please describe the workflow you want to generate.' };
  }
  if (prompt.length > 2000) {
    return { ok: false, status: 400, error: 'Description is too long (max 2000 characters).' };
  }

  let aiResult: any;
  try {
    aiResult = await env.AI.run(AI_MODEL, {
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      max_tokens: 3072,
      temperature: 0.2,
    });
  } catch {
    return {
      ok: false,
      status: 502,
      error: 'The AI model could not be reached right now. Please try again in a moment.',
    };
  }

  const graph = normalizeGraph(aiResult);
  if (!graph) {
    return {
      ok: false,
      status: 502,
      error: 'The AI returned an unreadable flow. Try rephrasing your description.',
    };
  }

  return { ok: true, graph: repairGraph(graph) };
}
