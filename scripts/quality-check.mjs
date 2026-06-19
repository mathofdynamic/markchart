// Local AI-generation quality harness. Calls the LOCAL /api/v1/generate with a
// seeded test key and audits each returned flow for structural problems.
const BASE = 'http://127.0.0.1:8788';
const KEY = 'mk_live_testkey123456';

const PROMPTS = [
  'A user uploads a file. Validate it is a PDF under 10MB. If valid, extract the text and save it to the database; otherwise show an error and let them re-upload.',
  'When a customer places an order, check inventory. If in stock, charge their card and ship it. If payment fails, retry up to 3 times, then cancel.',
  'When a user logs in, check the password. If correct go to dashboard, if wrong show an error and let them retry, but lock the account after 3 tries.',
  'CI pipeline: run the tests. If they pass, build and deploy to production. If they fail, notify the team on Slack and stop.',
  'Password reset: user requests a reset, we email a link. If they click it within 1 hour, let them set a new password; otherwise the link expires and they must request again.',
  'A support ticket arrives. Classify priority. If urgent, page on-call; otherwise queue it. After resolving, ask for feedback and close.',
];

const audit = (flow) => {
  const nodes = flow.nodes || [];
  const edges = flow.edges || [];
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const out = new Map(nodes.map((n) => [n.id, []]));
  const inc = new Map(nodes.map((n) => [n.id, 0]));
  for (const e of edges) {
    if (out.has(e.source)) out.get(e.source).push(e);
    if (inc.has(e.target)) inc.set(e.target, inc.get(e.target) + 1);
  }
  const issues = [];
  const starts = nodes.filter((n) => n.type === 'start');
  const ends = nodes.filter((n) => n.type === 'end');
  if (starts.length !== 1) issues.push(`starts=${starts.length} (want 1)`);
  if (ends.length < 1) issues.push('no end node');

  for (const n of nodes) {
    const o = out.get(n.id);
    const label = `${n.type}:"${n.label}"`;
    if (n.type === 'decision') {
      if (o.length < 2) issues.push(`decision <2 out: ${label}`);
      const unl = o.filter((e) => !e.label || !e.label.trim());
      if (unl.length) issues.push(`decision edge unlabeled: ${label}`);
    } else if (n.type !== 'loop' && n.type !== 'note' && n.type !== 'end') {
      if (o.length > 1) issues.push(`NON-decision branches (${o.length} out): ${label}`);
    }
    // connectivity (ignore notes)
    if (n.type !== 'note') {
      if (n.type !== 'start' && inc.get(n.id) === 0) issues.push(`orphan (no incoming): ${label}`);
      if (n.type !== 'end' && o.length === 0) issues.push(`dead-end (no outgoing): ${label}`);
    }
  }
  return issues;
};

let totalIssues = 0;
for (const prompt of PROMPTS) {
  try {
    const res = await fetch(`${BASE}/api/v1/generate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    if (!res.ok) {
      console.log(`\n❌ [${res.status}] ${prompt.slice(0, 50)}…`);
      continue;
    }
    const data = await res.json();
    const issues = audit(data.flow);
    totalIssues += issues.length;
    console.log(`\n— ${data.flow.title}  (${data.flow.nodes.length} nodes, ${data.flow.edges.length} edges)`);
    console.log(`  "${prompt.slice(0, 60)}…"`);
    if (issues.length === 0) console.log('  ✅ clean');
    else issues.forEach((i) => console.log(`  ⚠️  ${i}`));
  } catch (e) {
    console.log(`\n💥 ${prompt.slice(0, 40)} → ${e.message}`);
  }
}
console.log(`\n==== TOTAL ISSUES: ${totalIssues} ====`);
