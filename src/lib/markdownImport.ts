import { GeneratedGraph, GeneratedNode, GeneratedEdge, NodeType } from '../types';

/**
 * Parse text into a flow graph from one of two deterministic formats:
 *   - "Simple MarkChart format"  (see docs/FLOW_FORMAT.md)
 *   - Mermaid `flowchart` (the subset MarkChart's exporter emits)
 *
 * Returns null if the text matches neither (the caller can then fall back to AI
 * interpretation). Pure / React-free so the backend can reuse it too.
 */

const VALID_TYPES: NodeType[] = ['start', 'end', 'process', 'decision', 'loop', 'io', 'note'];

function normalizeType(raw: string): NodeType {
  const t = raw.toLowerCase();
  if (t === 'action') return 'process';
  return (VALID_TYPES as string[]).includes(t) ? (t as NodeType) : 'process';
}

function stripQuotes(s: string): string {
  return s.trim().replace(/^"(.*)"$/s, '$1').trim();
}

export interface ParsedFlow {
  graph: GeneratedGraph;
  format: 'simple' | 'mermaid';
}

// ---------------------------------------------------------------------------
// Simple MarkChart format
// ---------------------------------------------------------------------------

const SIMPLE_NODE_RE =
  /^\s*\[(start|end|process|decision|loop|io|note|action)\]\s+([A-Za-z0-9_-]+)\s*:\s*(.+?)\s*$/i;
// edge:  id1 -> id2            |  id1 -> id2 : Label   |  id1 -> id2 |Label|
const SIMPLE_EDGE_RE =
  /^\s*([A-Za-z0-9_-]+)\s*->\s*([A-Za-z0-9_-]+)\s*(?::\s*(.+?)|\|\s*(.+?)\s*\|)?\s*$/;

export function parseSimple(text: string): GeneratedGraph | null {
  const lines = text.split(/\r?\n/);
  const nodes: GeneratedNode[] = [];
  const seen = new Set<string>();
  const edges: { source: string; target: string; label?: string }[] = [];
  let title: string | undefined;
  let description: string | undefined;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//')) continue;

    if (trimmed.startsWith('#')) {
      if (title === undefined) title = trimmed.replace(/^#+\s*/, '').trim();
      continue;
    }
    if (trimmed.startsWith('>')) {
      if (description === undefined) description = trimmed.replace(/^>\s*/, '').trim();
      continue;
    }

    const nodeMatch = trimmed.match(SIMPLE_NODE_RE);
    if (nodeMatch) {
      const id = nodeMatch[2];
      if (seen.has(id)) return null; // duplicate id → malformed
      seen.add(id);
      nodes.push({ id, type: normalizeType(nodeMatch[1]), label: nodeMatch[3].trim().slice(0, 120) });
      continue;
    }

    const edgeMatch = trimmed.match(SIMPLE_EDGE_RE);
    if (edgeMatch) {
      const label = (edgeMatch[3] ?? edgeMatch[4] ?? '').trim();
      edges.push({ source: edgeMatch[1], target: edgeMatch[2], label: label || undefined });
      continue;
    }

    // Any other non-blank, non-comment line means this isn't Simple format.
    return null;
  }

  // Recognition gate: real nodes, real edges, and every edge endpoint declared.
  if (nodes.length === 0 || edges.length === 0) return null;
  for (const e of edges) {
    if (!seen.has(e.source) || !seen.has(e.target)) return null;
  }

  const cleanEdges: GeneratedEdge[] = edges.map((e) => ({
    source: e.source,
    target: e.target,
    label: e.label,
  }));

  return { title, description, nodes, edges: cleanEdges };
}

// ---------------------------------------------------------------------------
// Mermaid (the subset MarkChart's exporter emits)
// ---------------------------------------------------------------------------

// Order matters: {{ }} before { }, and [/ /] before [ ].
const MERMAID_SHAPES: { re: RegExp; type: (label: string) => NodeType; strip?: RegExp }[] = [
  { re: /^([A-Za-z0-9_]+)\{\{(.+?)\}\}$/, type: () => 'loop' },
  { re: /^([A-Za-z0-9_]+)\{(.+?)\}$/, type: () => 'decision' },
  {
    re: /^([A-Za-z0-9_]+)\(\[(.+?)\]\)$/,
    type: (l) => (/^end:/i.test(l) ? 'end' : 'start'),
    strip: /^(start|end):\s*/i,
  },
  { re: /^([A-Za-z0-9_]+)\[\/(.+?)\/\]$/, type: () => 'io' },
  {
    re: /^([A-Za-z0-9_]+)\[(.+?)\]$/,
    type: (l) => (/^note:/i.test(l) ? 'note' : 'process'),
    strip: /^note:\s*/i,
  },
];

const MERMAID_EDGE_RE = /^([A-Za-z0-9_]+)\s*-->\s*(?:\|\s*(.+?)\s*\|\s*)?([A-Za-z0-9_]+)$/;

function stripNodePrefix(id: string): string {
  return id.replace(/^node_/, '');
}

export function parseMermaid(text: string): GeneratedGraph | null {
  const lines = text.split(/\r?\n/);
  const nodeMap = new Map<string, GeneratedNode>();
  const edges: GeneratedEdge[] = [];
  let hasDirective = false;
  let title: string | undefined;
  let unmatched = 0;

  const ensureNode = (rawId: string): string => {
    const id = stripNodePrefix(rawId);
    if (!nodeMap.has(id)) nodeMap.set(id, { id, type: 'process', label: id });
    return id;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (/^(flowchart|graph)\b/i.test(trimmed)) {
      hasDirective = true;
      continue;
    }
    if (trimmed.startsWith('%%')) {
      const m = trimmed.match(/^%%\s*Title:\s*(.+)$/i);
      if (m && title === undefined) title = m[1].trim();
      continue;
    }

    // Edge?
    const edgeMatch = trimmed.match(MERMAID_EDGE_RE);
    if (edgeMatch) {
      const source = ensureNode(edgeMatch[1]);
      const target = ensureNode(edgeMatch[3]);
      const label = stripQuotes(edgeMatch[2] ?? '');
      edges.push({ source, target, label: label || undefined });
      continue;
    }

    // Node shape?
    let matchedShape = false;
    for (const shape of MERMAID_SHAPES) {
      const m = trimmed.match(shape.re);
      if (!m) continue;
      const id = stripNodePrefix(m[1]);
      let label = stripQuotes(m[2]);
      if (shape.strip) label = label.replace(shape.strip, '').trim();
      nodeMap.set(id, { id, type: shape.type(stripQuotes(m[2])), label: label.slice(0, 120) });
      matchedShape = true;
      break;
    }
    if (matchedShape) continue;

    unmatched += 1;
  }

  const nodes = [...nodeMap.values()];
  // Recognition gate: needs real structure, and (unless it declared a flowchart
  // directive) every line must have been understood — so prose doesn't sneak in.
  if (nodes.length === 0 || edges.length === 0) return null;
  if (!hasDirective && unmatched > 0) return null;

  return { title, nodes, edges };
}

// ---------------------------------------------------------------------------

/** Try Simple format, then Mermaid. Returns null if neither matches. */
export function parseFlowInput(text: string): ParsedFlow | null {
  const simple = parseSimple(text);
  if (simple) return { graph: simple, format: 'simple' };
  const mermaid = parseMermaid(text);
  if (mermaid) return { graph: mermaid, format: 'mermaid' };
  return null;
}
