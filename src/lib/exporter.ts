import { Flow, Node } from '../types';

/**
 * Sanitizes node IDs for Mermaid to ensure syntax validity.
 * Converts any non-alphanumeric character into an underscore.
 */
function getMermaidId(nodeId: string): string {
  return `node_${nodeId.replace(/[^a-zA-Z0-9]/g, '_')}`;
}

/**
 * Escapes quotes and wraps strings for safe Mermaid consumption without syntax crashes.
 */
function sanitizeMermaidText(text: string): string {
  return text.replace(/"/g, "'").replace(/\n/g, ' ');
}

/**
 * Translates a Flow graph into a clean step-by-step Markdown instruction format.
 * Traces step execution starting from the 'start' node using a Breadth-First Order
 * to ensure intuitive, sequentially formatted reading for LLMs.
 * 
 * Safe against cycles and disconnected graphs by logging visited nodes and
 * providing explicit step anchors.
 */
export function toMarkdown(flow: Flow): string {
  const { title, description, nodes, edges } = flow;

  if (nodes.length === 0) {
    return `## Flow: ${title || 'Untitled Flow'}\n\nNo nodes in this flow. Add some elements to begin.`;
  }

  // 1. Traverse starting from 'start' type nodes, then append any remaining unvisited nodes
  const visited = new Set<string>();
  const orderedNodes: Node[] = [];
  const queue: Node[] = [];

  // Find all start nodes (usually just one)
  const startNodes = nodes.filter(n => n.type === 'start');
  startNodes.forEach(sn => {
    queue.push(sn);
    visited.add(sn.id);
  });

  // Perform BFS to order node list starting from standard process roots
  while (queue.length > 0) {
    const current = queue.shift()!;
    orderedNodes.push(current);

    const outgoingEdges = edges.filter(e => e.source === current.id);
    outgoingEdges.forEach(edge => {
      const targetNode = nodes.find(n => n.id === edge.target);
      if (targetNode && !visited.has(targetNode.id)) {
        visited.add(targetNode.id);
        queue.push(targetNode);
      }
    });
  }

  // Handle any nodes that were disconnected or unvisited by the starting BFS trace
  nodes.forEach(node => {
    if (!visited.has(node.id)) {
      orderedNodes.push(node);
      visited.add(node.id);
    }
  });

  // Calculate quick dictionary mapping of node IDs to list order index for step referencing
  const stepMap = new Map<string, number>();
  orderedNodes.forEach((node, index) => {
    stepMap.set(node.id, index + 1);
  });

  // 2. Build the Markdown Output
  let md = `## Flow: ${title || 'Untitled Flow'}\n`;
  if (description && description.trim()) {
    md += `*${description.trim()}*\n`;
  }
  md += `\n`;

  orderedNodes.forEach((node, idx) => {
    const stepNum = idx + 1;
    const cleanLabel = node.label.trim() || `Untitled ${node.type}`;
    
    // Header for each type
    let typeDisplay = 'Action/Process';
    if (node.type === 'start') typeDisplay = 'Start';
    else if (node.type === 'end') typeDisplay = 'End';
    else if (node.type === 'decision') typeDisplay = 'Decision';
    else if (node.type === 'loop') typeDisplay = 'Loop';
    else if (node.type === 'io') typeDisplay = 'Input/Output';
    else if (node.type === 'note') typeDisplay = 'Note';

    md += `${stepNum}. **${typeDisplay}**: ${cleanLabel}\n`;
    if (node.description && node.description.trim()) {
      md += `   _Description: ${node.description.trim()}_\n`;
    }

    // Process outgoing paths for flow routing context
    const outgoing = edges.filter(e => e.source === node.id);

    if (outgoing.length > 0) {
      outgoing.forEach(edge => {
        const destNode = nodes.find(n => n.id === edge.target);
        if (destNode) {
          const destStep = stepMap.get(destNode.id) || '?';
          const destLabel = destNode.label.trim() || `Step ${destStep}`;
          const edgeLabel = edge.label && edge.label.trim() ? `**${edge.label.trim()}**` : '';

          const isLoopBack = typeof destStep === 'number' && destStep <= stepNum;
          const transitionWord = isLoopBack ? 'loop back to' : 'proceed to';

          if (node.type === 'decision' || node.type === 'loop') {
            const pathPrefix = edgeLabel ? `${edgeLabel} ` : '';
            md += `   - If ${pathPrefix}→ ${transitionWord} **Step ${destStep}** ("${destLabel}")\n`;
          } else {
            const edgeDesc = edgeLabel ? ` via ${edgeLabel}` : '';
            md += `   - Next → ${transitionWord} **Step ${destStep}** ("${destLabel}")${edgeDesc}\n`;
          }
        }
      });
    } else {
      if (node.type === 'end') {
        md += `   - Final termination of process.\n`;
      } else if (node.type !== 'note') {
        md += `   - Ends here (No outgoing connections).\n`;
      }
    }
  });

  return md;
}

/**
 * Translates a Flow graph into a valid Mermaid flowchart syntax string.
 * Uses customized node geometries (diamonds, hexagons, round caps, parallelograms)
 * depending on the node type to deliver highly readable flow visualizer syntax.
 */
export function toMermaid(flow: Flow): string {
  const { title, nodes, edges } = flow;
  
  let mermaid = `flowchart TD\n`;
  mermaid += `  %% Flowchart ID: ${flow.id}\n`;
  mermaid += `  %% Title: ${title || 'Untitled Flow'}\n`;

  if (nodes.length === 0) {
    mermaid += `  emptyNode["Canvas is empty"]\n`;
    return mermaid;
  }

  // Define Nodes and custom shapes
  nodes.forEach(node => {
    const mId = getMermaidId(node.id);
    const cleanLabel = sanitizeMermaidText(node.label || `Untitled ${node.type}`);

    switch (node.type) {
      case 'start':
        mermaid += `  ${mId}(["Start: ${cleanLabel}"])\n`;
        break;
      case 'end':
        mermaid += `  ${mId}(["End: ${cleanLabel}"])\n`;
        break;
      case 'decision':
        mermaid += `  ${mId}{"${cleanLabel}"}\n`;
        break;
      case 'loop':
        mermaid += `  ${mId}{{\"${cleanLabel}\"}}\n`;
        break;
      case 'io':
        mermaid += `  ${mId}[/"${cleanLabel}"/]\n`;
        break;
      case 'note':
        mermaid += `  ${mId}["Note: ${cleanLabel}"]\n`;
        break;
      case 'process':
      default:
        mermaid += `  ${mId}["${cleanLabel}"]\n`;
        break;
    }
  });

  mermaid += `\n`;

  // Define Connection Edges
  edges.forEach(edge => {
    const sourceId = getMermaidId(edge.source);
    const targetId = getMermaidId(edge.target);
    const label = edge.label ? sanitizeMermaidText(edge.label.trim()) : '';

    if (label) {
      mermaid += `  ${sourceId} -->|"${label}"| ${targetId}\n`;
    } else {
      mermaid += `  ${sourceId} --> ${targetId}\n`;
    }
  });

  return mermaid;
}
