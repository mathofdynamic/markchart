import { Flow } from '../types';

/**
 * Validates a Flow and returns an array of warning messages.
 * 
 * Warnings identified:
 * - Missing 'Start' or 'End' nodes
 * - Completely disconnected nodes (no incoming or outgoing edges)
 * - Decision nodes with fewer than 2 outgoing edges (should branch)
 * - Decision/Loop nodes with unlabeled outgoing edges
 */
export function validate(flow: Flow): string[] {
  const warnings: string[] = [];
  const { nodes, edges } = flow;

  if (nodes.length === 0) {
    return ['The canvas is empty. Add a Start node to begin your flow.'];
  }

  // 1. Check for missing Start or End nodes
  const hasStart = nodes.some(n => n.type === 'start');
  const hasEnd = nodes.some(n => n.type === 'end');

  if (!hasStart) {
    warnings.push("Missing 'Start' node to indicate the beginning of your process.");
  }
  if (!hasEnd) {
    warnings.push("Missing 'End' node to specify where the flow terminates.");
  }

  // 2. Identify disconnected nodes
  // Complete isolated nodes have no edges where they are either source or target
  const edgeNodes = new Set<string>();
  edges.forEach(edge => {
    edgeNodes.add(edge.source);
    edgeNodes.add(edge.target);
  });

  nodes.forEach(node => {
    if (!edgeNodes.has(node.id)) {
      const name = node.label.trim() || `Untitled ${node.type}`;
      warnings.push(`Node "${name}" is completely disconnected from the flow.`);
    }
  });

  // 3. Decision with fewer than 2 outgoing edges
  // 4. Unlabeled decision/loop branches
  nodes.forEach(node => {
    if (node.type === 'decision') {
      const outgoingEdges = edges.filter(e => e.source === node.id);
      const nodeName = node.label.trim() || 'Untitled Decision';
      
      if (outgoingEdges.length < 2) {
        warnings.push(`Decision "${nodeName}" has fewer than 2 outgoing branches (e.g., needs 'Yes' and 'No' paths).`);
      }

      // Check for unlabeled branches on decisions
      const hasUnlabeledBranch = outgoingEdges.some(e => !e.label || !e.label.trim());
      if (hasUnlabeledBranch && outgoingEdges.length > 0) {
        warnings.push(`Decision "${nodeName}" has outgoing branches with missing labels (e.g., please name them 'Yes', 'No', etc.).`);
      }
    }

    if (node.type === 'loop') {
      const outgoingEdges = edges.filter(e => e.source === node.id);
      const nodeName = node.label.trim() || 'Untitled Loop';

      // Check for unlabeled branches on loops
      const hasUnlabeledBranch = outgoingEdges.some(e => !e.label || !e.label.trim());
      if (hasUnlabeledBranch && outgoingEdges.length > 0) {
        warnings.push(`Loop "${nodeName}" has outgoing branches with missing labels (e.g., 'loop back', 'until complete', etc.).`);
      }
    }
  });

  return warnings;
}
