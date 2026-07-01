import { describe, it, expect } from 'vitest';
import { toMarkdown } from './exporter';
import { Flow } from '../types';

describe('toMarkdown loop-back detection', () => {
  it('does NOT label a converging (merge) branch as a loop back', () => {
    // A -> X(decision); X --Yes--> Y ; X --No--> N1 ; N1 -> Y.
    // N1 -> Y is a forward merge onto a shared continuation, not a cycle.
    const flow: Flow = {
      id: 'f',
      title: 'Merge',
      description: '',
      nodes: [
        { id: 'A', type: 'start', label: 'A', position: { x: 0, y: 0 } },
        { id: 'X', type: 'decision', label: 'X', position: { x: 0, y: 1 } },
        { id: 'Y', type: 'end', label: 'Y', position: { x: 0, y: 2 } },
        { id: 'N1', type: 'process', label: 'N1', position: { x: 0, y: 3 } },
      ],
      edges: [
        { id: 'e1', source: 'A', target: 'X' },
        { id: 'e2', source: 'X', target: 'Y', label: 'Yes' },
        { id: 'e3', source: 'X', target: 'N1', label: 'No' },
        { id: 'e4', source: 'N1', target: 'Y' },
      ],
    };
    expect(toMarkdown(flow)).not.toContain('loop back');
  });

  it('DOES label a genuine cycle as a loop back', () => {
    // A -> B -> C -> A closes a real cycle.
    const flow: Flow = {
      id: 'f',
      title: 'Cycle',
      description: '',
      nodes: [
        { id: 'A', type: 'start', label: 'A', position: { x: 0, y: 0 } },
        { id: 'B', type: 'process', label: 'B', position: { x: 0, y: 1 } },
        { id: 'C', type: 'decision', label: 'C', position: { x: 0, y: 2 } },
      ],
      edges: [
        { id: 'e1', source: 'A', target: 'B' },
        { id: 'e2', source: 'B', target: 'C' },
        { id: 'e3', source: 'C', target: 'A', label: 'again' },
      ],
    };
    expect(toMarkdown(flow)).toContain('loop back');
  });
});
