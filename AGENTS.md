# AI Agent Rules — Entry Point

You are working in a repository governed by a rule system. Before doing anything:

1. Read every file in `.ai/rules/` — these rules are binding.
2. Read `.ai/context/constraints.md` in full. Search `decisions.md` and `gotchas.md` on demand (`11`). Context overrides generic rules.
3. Never modify existing code without explicit user confirmation (`.ai/rules/02_confirmation_workflow.md`).

## Files to read

Each line below is a file path. Tools that support `@` imports load them automatically; otherwise, read each one.
When a file is added to `.ai/rules/` or `.ai/context/`, add its line here — context files other than `constraints.md` in backticks, so they are searched, not loaded.

- @.ai/rules/01_core_engineering.md
- @.ai/rules/02_confirmation_workflow.md
- @.ai/rules/03_communication_style.md
- @.ai/rules/04_naming_conventions.md
- @.ai/rules/05_comments.md
- @.ai/rules/06_backend_architecture.md
- @.ai/rules/07_frontend_architecture.md
- @.ai/rules/08_languages.md
- @.ai/rules/09_security.md
- @.ai/rules/10_git_and_testing.md
- @.ai/rules/11_project_context.md
- @.ai/rules/12_poc_mode.md
- @.ai/rules/13_debugging.md
- @.ai/rules/14_execution_safety.md
- @.ai/rules/15_critical_thinking.md
- @.ai/rules/16_problem_solving_and_model_routing.md
- @.ai/context/constraints.md
- `.ai/context/decisions.md` — search on demand (`11`)
- `.ai/context/gotchas.md` — search on demand (`11`)

## Non-Negotiables (apply even before the rule files are read)

- Explain → propose → wait. No confirmation = no change. A question is not an instruction (`02`).
- Judge every command by its effect, not its name; anything that changes state is confirmed first (`14`).
- Commit message only when asked: one line, `type: summary`, no body, no footer, no attribution (`10`).
- Answer first, in short points. Questions to the user are yes/no or pick-one (`03`).
- Explanations go gist → analogy → visual → example; "didn't get it" means switch method, never reword (`03`).
- For work that meets `16` §1 sizing: understand before solving; recommend a model tier (the user switches); plan only when asked, written so a cheaper model can execute it (`16`).
- Verify facts against current docs or source; never invent an API, flag, or symbol (`15`).
- Security never relaxes — POC or not; insecure requests are flagged and proceed only after explicit risk acknowledgement (`09`).
- Previews stay local; never publish to a hosted service unless asked (`14`).

## Precedence (highest wins)

1. The user's explicit instruction in the current conversation (security flags still apply — see `09_security.md`).
2. `.ai/context/` — recorded project decisions and constraints.
3. Existing conventions in this codebase.
4. `.ai/rules/` — generic defaults.

## Work Modes

- **Feature work** (default) — all rules apply as written.
- **POC** — only when the user explicitly declares it: apply `.ai/rules/12_poc_mode.md`.
- **Debugging** — whenever finding/fixing a bug: apply `.ai/rules/13_debugging.md`.
