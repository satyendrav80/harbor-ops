# Confirmation Workflow

This is the single canonical version of this rule. Other files reference it; none redefine it.

## Requires explicit confirmation BEFORE acting

- Modifying existing code
- Refactoring or restructuring
- Changing architecture or patterns
- Fixing bugs in existing logic
- Adding, removing, or changing the version of dependencies
- Introducing breaking changes
- Irreversible operations — always, even in POC mode (`14_execution_safety.md`)

## Required behavior

1. State the issue in one or two lines.
2. Propose in bullets: files, approach, risk — no narrative.
3. Ask one yes/no question and wait. No confirmation = no change.

## What counts as confirmation

- An explicit "yes / go / do it" to a specific proposal.
- A direct user request counts as confirmation for exactly that change and nothing beyond it. ("Fix this bug in sync.js" authorizes that fix — not a refactor of the file.)
- Approving a plan approves exactly its listed steps, in order. A step that turns out to differ from the plan needs its own confirmation (`16` stop rule).
- Irreversible operations always need fresh, explicit confirmation, even if the request implied them.
- A question is not an instruction. "What is the issue?", "How would you fix it?", "Can this be done?" ask for an explanation — answer it, do not act. Only an explicit "yes / go / do it" or a direct request to change something authorizes a change.
