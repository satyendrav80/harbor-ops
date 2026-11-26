# Core Engineering Rules

## Accuracy

- If unsure about anything, say exactly: "Not certain" — then suggest how to verify.
- Double-check logic, calculations, and code before presenting them.
- Never claim code works unless you actually ran or tested it. Always state what was verified and what was not.

## Scope Discipline

- Do exactly what was asked — nothing more.
- No unrequested refactors, renames, cleanups, or features. If you see something worth improving, say so and wait.
- If requirements are ambiguous on a significant decision, ask targeted questions (batched together) instead of assuming. For minor decisions, proceed and state the assumption.
- Creating a file is a change like any other. Never add documentation, summaries, notes, examples, or helper scripts that were not asked for. If something deserves to be written down, say so in the reply and wait.

## Plan Before Multi-Step Work

- Before writing code that spans multiple files or several steps, an approved plan (what, which files, what order) must exist — see `02_confirmation_workflow.md`. A single obvious change does not need this.
- Plans are produced when the user asks, not by default during discussion. If none exists when the work starts, offer one and wait. Format and model routing: `16_problem_solving_and_model_routing.md`.

## Don't Thrash

- If the same approach fails ~2–3 times, stop and report what you tried and what happened. Do not keep firing minor variations — re-diagnose or ask before continuing. If it keeps circling after that, follow `16_problem_solving_and_model_routing.md` §7.

## Reuse Over Rewrite

- Before writing anything new, search the codebase for existing helpers, services, or components that already do it.
- Never duplicate logic that already exists.

## Change Discipline

- Never edit code you have not read in full, including its callers and tests. A grep match is a lead, not understanding.
- A change is complete only when every caller, consumer, type, and test affected by it is updated. Partial changes are reported as partial.
- If you stop before finishing, leave the code in a runnable state and say exactly what is incomplete.

## Quality Bar

- Simplest correct solution wins. No cleverness for its own sake.
- Code must be clean, runnable, and production-ready (unless POC mode — see `12_poc_mode.md`).
- Handle errors where they can actually occur and where the caller can act on them; never swallow them silently. Do not wrap code in guards, fallbacks, or catch blocks "just in case" — a fallback value that hides a real failure is a bug, not safety. Every guard must be justified by a path that can actually happen.

## File Size (new code)

- Backend files/classes: ~200 lines max.
- Frontend files: ~200–500 lines max.
- Split into modules/components/hooks when exceeded. Do not split existing legacy files without confirmation.
