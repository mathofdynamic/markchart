import { Edge as ModelEdge, GeneratedGraph, Node as ModelNode, NodeType } from '../types';

/**
 * Turns an AI-generated logical graph into positioned Flow nodes/edges.
 *
 * LLMs are unreliable at x/y coordinates, so the model never returns positions.
 * Instead we compute a clean top-down layered layout here: a BFS from the start
 * node(s) assigns each node a depth (row), and nodes sharing a depth are spread
 * across columns. Loop-back edges don't change depth — they just draw upward.
 */

const VALID_TYPES: NodeType[] = ['start', 'end', 'process', 'decision', 'loop', 'io', 'note'];

// Node cards are up to 280px wide and ~200px tall (see CustomNode), so gaps must
// exceed those to leave a comfortable gutter between cards and room for edge labels.
const X_GAP = 380; // horizontal spacing between sibling nodes (centers)
const Y_GAP = 300; // vertical spacing between layers
const X_ORIGIN = 400;
const Y_ORIGIN = 60;

export function layoutGeneratedFlow(graph: GeneratedGraph): {
  nodes: ModelNode[];
  edges: ModelEdge[];
} {
  const rawNodes = (graph.nodes || []).filter((n) => n && n.id != null);
  if (rawNodes.length === 0) return { nodes: [], edges: [] };

  // Stable, unique real ids keyed by the model's temporary ids.
  const stamp = Date.now();
  const idMap = new Map<string, string>();
  rawNodes.forEach((n, i) => idMap.set(String(n.id), `node_${stamp}_${i}`));

  // Build adjacency + in-degree over edges that reference real nodes.
  const outAdj = new Map<string, string[]>();
  const inDeg = new Map<string, number>();
  rawNodes.forEach((n) => {
    outAdj.set(String(n.id), []);
    inDeg.set(String(n.id), 0);
  });

  const validEdges = (graph.edges || []).filter(
    (e) => e && idMap.has(String(e.source)) && idMap.has(String(e.target)),
  );
  validEdges.forEach((e) => {
    const s = String(e.source);
    const t = String(e.target);
    outAdj.get(s)!.push(t);
    inDeg.set(t, (inDeg.get(t) || 0) + 1);
  });

  // Seed the BFS from explicit start nodes, falling back to any root (in-degree 0).
  const depth = new Map<string, number>();
  const queue: string[] = [];
  rawNodes.forEach((n) => {
    const id = String(n.id);
    if (n.type === 'start' || (inDeg.get(id) || 0) === 0) {
      depth.set(id, 0);
      queue.push(id);
    }
  });
  if (queue.length === 0) {
    const first = String(rawNodes[0].id);
    depth.set(first, 0);
    queue.push(first);
  }

  while (queue.length > 0) {
    const cur = queue.shift()!;
    const d = depth.get(cur)!;
    for (const target of outAdj.get(cur) || []) {
      if (!depth.has(target)) {
        depth.set(target, d + 1);
        queue.push(target);
      }
    }
  }

  // Any node unreachable from a root (rare) gets stacked below everything.
  let maxDepth = 0;
  depth.forEach((d) => {
    if (d > maxDepth) maxDepth = d;
  });
  rawNodes.forEach((n) => {
    const id = String(n.id);
    if (!depth.has(id)) {
      maxDepth += 1;
      depth.set(id, maxDepth);
    }
  });

  // Group by depth to spread siblings across columns, centered on X_ORIGIN.
  const byDepth = new Map<number, string[]>();
  rawNodes.forEach((n) => {
    const id = String(n.id);
    const d = depth.get(id)!;
    if (!byDepth.has(d)) byDepth.set(d, []);
    byDepth.get(d)!.push(id);
  });

  const position = new Map<string, { x: number; y: number }>();
  byDepth.forEach((ids, d) => {
    const count = ids.length;
    ids.forEach((id, i) => {
      position.set(id, {
        x: (i - (count - 1) / 2) * X_GAP + X_ORIGIN,
        y: d * Y_GAP + Y_ORIGIN,
      });
    });
  });

  const nodes: ModelNode[] = rawNodes.map((n) => {
    const id = String(n.id);
    const type = (VALID_TYPES.includes(n.type as NodeType) ? n.type : 'process') as NodeType;
    return {
      id: idMap.get(id)!,
      type,
      label: (n.label || '').trim() || 'Untitled',
      description: (n.description || '').trim() || undefined,
      position: position.get(id) || { x: X_ORIGIN, y: Y_ORIGIN },
    };
  });

  const edges: ModelEdge[] = validEdges.map((e, i) => ({
    id: `edge_${stamp}_${i}`,
    source: idMap.get(String(e.source))!,
    target: idMap.get(String(e.target))!,
    label: (e.label || '').trim() || undefined,
  }));

  return { nodes, edges };
}
