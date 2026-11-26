# Project Context System

`.ai/context/` holds this project's durable knowledge. It exists so that every agent, in every tool, in every session, knows what was already learned.

## Location

- Context always lives in the CURRENT project's own `.ai/context/` — never in a master/global copy of this ruleset. If this project has no `.ai/` folder, propose installing the kit here first; do not write context anywhere else.

## Reading

- Read `constraints.md` in full at the start of every session.
- Never load `decisions.md` or `gotchas.md` whole. Before changing code, diagnosing a bug, or answering a question about an area, search `decisions.md`, `gotchas.md`, and their split folders (`decisions/`, `gotchas/`) for that area's file names, feature names, and key terms. Before proposing a design, search `decisions.md` for it.
- Context entries override generic rules in `.ai/rules/` when they conflict.

## Writing — entry format

Every entry is a RULE + REASON, never history:

- Correct: "Always compare timestamps in UTC in the sync layer, because the DB stores IST while the external API returns UTC."
- Wrong: "Fixed the timezone bug in sync.js." (changelog — belongs in git, not here)

Keep entries to 1–3 lines. Link to files/docs instead of pasting code. Never store secrets.

- Name the files or feature each entry applies to, so it can be found by search.
- An entry that overrides a generic rule in `.ai/rules/` goes in `constraints.md` — only that file is always loaded, so only there can an override take effect reliably.

## Files

- `decisions.md` — choices made and why ("we use X because Y")
- `constraints.md` — things that must not change, and why
- `gotchas.md` — non-obvious traps learned the hard way

Create additional files only with user agreement.

- Before adding an entry, check the file's size. Limits: `constraints.md` ~20 KB (loaded every session), `decisions.md` and `gotchas.md` ~50 KB each (keeps search results clean).
- Over the limit: tell the user and propose a cleanup before adding — remove obsolete or superseded entries, merge duplicates, drop history; move excess constraints to `decisions.md`. If still over, propose splitting by area into `decisions/<area>.md` (or `gotchas/<area>.md`), with `<area>` named after the code folder or feature; the main file keeps only entries that apply across areas. Report the entry count before and after: a split must match exactly; a cleanup lists each removed or merged entry. Never clean up or split without confirmation.

## When to propose an entry

Whenever you discover something durable — a constraint, a decision, a trap — propose the exact wording to the user and add it only after confirmation. When an entry becomes obsolete, propose updating or removing it.
