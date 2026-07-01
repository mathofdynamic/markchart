// Round-trip / recognition test for the Markdown importer. Run with: npx tsx scripts/import-check.ts
import { toMermaid } from '../src/lib/exporter';
import { parseFlowInput, parseSimple, parseMermaid } from '../src/lib/markdownImport';
import { Flow } from '../src/types';

let failures = 0;
const ok = (cond: boolean, msg: string) => {
  console.log(`${cond ? '✅' : '❌'} ${msg}`);
  if (!cond) failures++;
};

// A known flow with every "interesting" type.
const flow: Flow = {
  id: 'flow_test',
  title: 'Login Flow',
  description: 'auth',
  nodes: [
    { id: 'a', type: 'start', label: 'User submits login', position: { x: 0, y: 0 } },
    { id: 'b', type: 'decision', label: 'Password correct?', position: { x: 0, y: 1 } },
    { id: 'c', type: 'end', label: 'Go to dashboard', position: { x: 0, y: 2 } },
    { id: 'd', type: 'process', label: 'Show error', position: { x: 0, y: 3 } },
    { id: 'e', type: 'loop', label: 'Retry?', position: { x: 0, y: 4 } },
    { id: 'f', type: 'io', label: 'Log attempt', position: { x: 0, y: 5 } },
  ],
  edges: [
    { id: 'e1', source: 'a', target: 'b' },
    { id: 'e2', source: 'b', target: 'c', label: 'Yes' },
    { id: 'e3', source: 'b', target: 'd', label: 'No' },
    { id: 'e4', source: 'd', target: 'e' },
    { id: 'e5', source: 'e', target: 'a', label: 'retry' },
    { id: 'e6', source: 'd', target: 'f' },
  ],
};

// 1) Mermaid round-trip
const mermaid = toMermaid(flow);
const rt = parseFlowInput(mermaid);
ok(!!rt && rt.format === 'mermaid', 'Mermaid export is recognised as mermaid');
if (rt) {
  ok(rt.graph.nodes.length === 6, `node count preserved (${rt.graph.nodes.length}/6)`);
  ok(rt.graph.edges.length === 6, `edge count preserved (${rt.graph.edges.length}/6)`);
  const typeOf = (label: string) => rt.graph.nodes.find((n) => n.label.includes(label))?.type;
  ok(typeOf('submits login') === 'start', 'start type preserved');
  ok(typeOf('Password correct') === 'decision', 'decision type preserved');
  ok(typeOf('dashboard') === 'end', 'end type preserved');
  ok(typeOf('Retry') === 'loop', 'loop type preserved');
  ok(typeOf('Log attempt') === 'io', 'io type preserved');
  const yes = rt.graph.edges.find((e) => e.label === 'Yes');
  ok(!!yes, 'edge label "Yes" preserved');
}

// 2) Simple format
const simple = `# Order
> place an order

[start] n1: Place order
[decision] n2: In stock?
[process] n3: Charge card
[end] n4: Done
[end] n5: Cancel

n1 -> n2
n2 -> n3 : Yes
n2 -> n5 : No
n3 -> n4`;
const s = parseSimple(simple);
ok(!!s && s.nodes.length === 5 && s.edges.length === 4, 'Simple format parses (5 nodes / 4 edges)');
ok(s?.title === 'Order', 'Simple title parsed');
ok(s?.nodes.find((n) => n.id === 'n2')?.type === 'decision', 'Simple decision type parsed');
ok(s?.edges.find((e) => e.source === 'n2' && e.target === 'n3')?.label === 'Yes', 'Simple edge label parsed');

// 3) Negative cases
ok(parseFlowInput('Just some prose describing a process, nothing structured.') === null, 'prose → null (AI fallback)');
ok(parseSimple('[start] n1: A\n[end] n2: B\nn1 -> nX') === null, 'edge to unknown id → null');
ok(parseSimple('[start] n1: A\n[start] n1: B\nn1 -> n1') === null, 'duplicate id → null');
// With a `flowchart` directive present, unknown lines (classDef/style/etc.) are tolerated.
ok(parseMermaid('flowchart TD\n  classDef x fill:#000\n  a --> b') !== null, 'mermaid + directive tolerates unknown lines');
// Without a directive, a junk line means it's not Mermaid → null (so prose never sneaks in).
ok(parseMermaid('random prose line\n  a --> b') === null, 'no directive + junk line → null (strict)');

console.log(`\n==== ${failures === 0 ? 'ALL PASSED' : failures + ' FAILED'} ====`);
process.exit(failures === 0 ? 0 : 1);
