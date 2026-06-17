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
