/**
 * Bridges the pure (no-React) flow helpers from src/ into the Functions bundle,
 * so the API can lay out AI graphs and produce Markdown / Mermaid exactly like
 * the web app does. Keeping the cross-boundary imports in one file keeps the
 * relative paths from sprawling across every endpoint.
 */
import { layoutGeneratedFlow } from '../src/lib/layout';
import { toMarkdown, toMermaid } from '../src/lib/exporter';
import { Flow } from '../src/types';
import { FlowGraph } from './_ai';

export { toMarkdown, toMermaid };
export type { Flow };

/** Turn an AI-generated logical graph into a positioned, ready-to-store Flow. */
export function graphToFlow(graph: FlowGraph, id: string, icon = 'FlowArrow'): Flow {
  const { nodes, edges } = layoutGeneratedFlow({
    title: graph.title,
    description: graph.description,
    nodes: graph.nodes,
    edges: graph.edges,
  });
  return {
    id,
    title: graph.title || 'AI Generated Flow',
    description: graph.description || '',
    icon,
    nodes,
    edges,
  };
}

/** Compute both text exports for a flow. */
export function flowExports(flow: Flow): { markdown: string; mermaid: string } {
  return { markdown: toMarkdown(flow), mermaid: toMermaid(flow) };
}
