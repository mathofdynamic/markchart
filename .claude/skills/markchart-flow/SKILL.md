---
name: markchart-flow
description: Write MarkChart flow input that imports cleanly. Use whenever someone wants to turn a process, procedure, decision tree, or workflow into a MarkChart flowchart, or asks for "MarkChart format", "MarkChart input", or importable flow text. Produces the Simple MarkChart format that MarkChart's importer parses deterministically (no AI needed on their end).
---

# Writing MarkChart flow input

MarkChart imports a flowchart from plain text. Your job: emit **Simple MarkChart format** that its parser accepts on the first try. The parser is strict and fails **silently** (it just returns "not recognized") — so the rules below are not style advice, they are hard requirements. Follow the procedure exactly.

## The one rule that matters most

**Output the flow text and nothing else.** No prose before or after. No ```code fences```. No "Here is your flow:". A single stray line anywhere makes the parser reject the *entire* input and fall back to AI guessing. If the user is pasting this into MarkChart's Import box, they need the raw text only.

(If you must explain something to the user, put the explanation in a *separate* message or after a clear separator — never inside the block they will copy.)

## The format

Line-oriented. Blank lines and lines starting with `//` are ignored.

```
# Title                        (optional — first # line becomes the flow title)
> One-line description         (optional — first > line becomes the description)

[type] id: Label               (a node)
source -> target : Label       (an edge; the ": Label" is optional)
```

### Node line — `[type] id: Label`
- `type` is one of the **seven** types below. `action` is accepted as an alias for `process`.
- `id` is a short token: letters, digits, `_`, `-` only (e.g. `n1`, `check_stock`). **No spaces.**
- `Label` is free text (keep under ~120 chars).
- Every `id` must be **unique**. A duplicate id kills the whole import.

### Edge line — `source -> target` (optional `: Label`)
- Written `a -> b`, or `a -> b : Yes`, or `a -> b |Yes|`.
- **Both `source` and `target` must be ids you declared as nodes above.** An edge pointing to an id you never defined kills the whole import.

## The seven node types

| type | use it for |
|------|-----------|
| `start` | the single entry point (have exactly one) |
| `end` | a terminal/exit point (you may have several) |
| `process` | a concrete action — "Charge the card", "Send email" |
| `decision` | a conditional branch — a yes/no or multi-way question |
| `loop` | a repeat/retry construct |
| `io` | reading input or writing output |
| `note` | a standalone annotation |

## Procedure

1. **Model the process** as nodes: one `start`, the actions/decisions in the middle, one or more `end` nodes.
2. **Assign short unique ids** (`n1`, `n2`, … is fine, or meaningful ones like `charge`, `ship`).
3. **Write all node lines first**, then all edge lines. (Order isn't required by the parser, but this keeps it readable and makes it easy to verify every edge endpoint exists.)
4. **Every `decision` needs 2+ outgoing edges, each with a label** (`Yes`/`No`, or the condition). A decision with one unlabeled exit is a modeling smell.
5. **Model a loop/retry** as an edge that points *back* to an earlier node, e.g. `verify -> submit : failed, retry`.
6. **Self-check before output** (see checklist). Then output the raw block only.

## Pre-output checklist (the parser enforces all of these)

- [ ] At least **one node AND one edge** (a lone node won't import).
- [ ] Every node `id` is **unique**.
- [ ] Every edge's `source` and `target` **matches a declared node id** exactly.
- [ ] Every non-blank line is either `# …`, `> …`, `// …`, a `[type] id: Label` node, or a `src -> tgt` edge. **Nothing else** — no headings, no bullet lists, no leftover prose, no code fences.
- [ ] Exactly one `start`; at least one `end`.
- [ ] Each `decision` has ≥2 labeled outgoing edges.

## Worked example

Request: "a flow for resetting a forgotten password."

```
# Password Reset
> Lets a user reset a forgotten password

[start]    n1: User requests reset
[process]  n2: Email a reset link
[decision] n3: Link used within 1 hour?
[process]  n4: Let user set a new password
[end]      n5: Password updated
[end]      n6: Link expired

n1 -> n2
n2 -> n3
n3 -> n4 : Yes
n3 -> n6 : No
n4 -> n5
```

## Loop/retry example

```
# Deploy with health check
> Retry deploy until the service is healthy

[start]    s: Start deploy
[process]  d: Deploy build
[io]       h: Check health status
[decision] q: Healthy?
[end]      done: Deploy complete

s -> d
d -> h
h -> q
q -> done : Yes
q -> d : No, redeploy
```

## Alternative input: Mermaid

MarkChart also imports the Mermaid `flowchart` subset it exports, so you can round-trip. Prefer Simple format unless the user specifically has Mermaid. If you do emit Mermaid, a `mermaid`-fenced block is fine (the Mermaid parser tolerates the fence; the Simple parser does not). Shape → type mapping: `id(["..."])` = start (or end if the label starts `End:`), `id["..."]` = process (or note if label starts `Note:`), `id{"..."}` = decision, `id{{"..."}}` = loop, `id[/"..."/]` = io. Edges: `a --> b` or `a -->|"label"| b`.

## Known limits
- Node **descriptions** aren't part of the import grammar — labels only.
- A flow needs at least one edge; isolated single nodes don't import.
