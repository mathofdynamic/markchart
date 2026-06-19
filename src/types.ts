/**
 * MarkChart Data Model Types
 */

export type NodeType = 'start' | 'end' | 'process' | 'decision' | 'loop' | 'io' | 'note';

export interface Node {
  id: string;
  type: NodeType;
  label: string;
  description?: string;
  position: { x: number; y: number };
}

export interface Edge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface Flow {
  id: string;
  title: string;
  description: string;
  icon?: string;
  nodes: Node[];
  edges: Edge[];
}

/**
 * Logical graph returned by the AI generation endpoint. It mirrors the Flow
 * model but carries no positions and uses the model's own temporary node ids
 * ("n1", "n2", …); the client assigns real ids and positions via auto-layout.
 */
export interface GeneratedNode {
  id: string;
  type: string;
  label: string;
  description?: string;
}

export interface GeneratedEdge {
  source: string;
  target: string;
  label?: string;
}

export interface GeneratedGraph {
  title?: string;
  description?: string;
  nodes: GeneratedNode[];
  edges: GeneratedEdge[];
}
