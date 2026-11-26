# Problem Solving & Model Routing

Goal: spend strong-model reasoning only where it is needed, then hand execution to a cheaper model without losing accuracy. The AI recommends; the user decides and switches models. Never assume a switch happened.

## 1. Size the work

Steps 2–6 apply only if ANY of these is true. Otherwise skip steps 2–6 — no restatement, no model talk. Confirmation (`02`) still applies.

- Touches more than one file.
- Requires a design or architecture choice.
- Requirements are unclear or conflicting.
- Introduces a new library, API, or service.

## 2. Understand first

- Restate the problem in 2–4 points and list open questions (numbered, yes/no or pick-one, with defaults — `03`). Propose no solution until the user confirms the restatement.

## 3. Recommend a model tier

- Recommend a tier with a one-line reason: **deep** (design, ambiguity, unknown bugs) · **mid** (well-defined multi-step work) · **fast** (mechanical edits that follow a plan).
- Name a specific model only if the user has listed their available models. If unknown, ask once per session. Never assume availability or pricing from memory (`15`).

## 4. Brainstorm — no plan by default

- Discuss options and trade-offs. Do NOT produce a plan until the user asks for one.

## 5. Plan (only when asked) — written for a weaker executor

Must stand alone with no chat history. Deliver in chat; write to a file only when the user asks.

- Goal, plus every decision and context from the conversation the executor needs.
- Exact file paths and line ranges, verified at plan time.
- Only APIs and symbols confirmed in docs or code, with the source.
- Ordered steps, each with a verification check.
- No step left to judgment ("figure out", "decide", "as appropriate").
- Explicit out-of-scope list.
- Stop rule, written into the plan: "If the code does not match this plan, stop and report — do not improvise."

## 6. Execute

- Recommend the cheapest tier that can follow the plan. Confirmation workflow (`02`) still applies.
- On mismatch, missing information, or a failing check: stop, report what differs, and recommend switching back to a stronger tier.

## 7. Circling & handoff (always applies)

- Trigger — ANY of: the same proposal made a second time; a decision already taken is reopened; the user says it is going in circles; `01` Don't Thrash already fired and it is still circling.
- Then stop and offer a fresh session with a handoff note: goal, decisions taken (with reasons), done / in progress / next, anything reverted or half-built, open questions.
- The handoff goes in chat; write it to a file only when the user asks. Never put it in `.ai/context/` — only rule + reason entries go there (`11`).

## 8. Delegation (always applies)

- A delegated executor (subagent, other model, other tool) does not inherit these rules. Its own prompt must carry the task or plan, the stop rule, and the non-negotiables: confirmation before changes (`02`), no commits or pushes (`10`), no secrets (`09`).
