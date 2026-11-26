# AI Rules Kit — Human Guide

This folder makes any AI coding agent follow one consistent set of engineering rules, in any project, with any model.

## Install into a project

1. Copy `AGENTS.md` to the project root.
2. Copy the `.ai/` folder to the project root.
3. Commit both to git. `.ai/context/` is project knowledge — it must be versioned.

That's it. Tools that read `AGENTS.md` natively pick it up automatically: Cursor, Codex, Windsurf, GitHub Copilot (Chat, coding agent, Visual Studio), and recent Claude Code (only when the repo has no `CLAUDE.md`; otherwise use the adapter below).

## Tool adapters (only if your tool does NOT read AGENTS.md in this repo)

Where an adapter is a file, it contains only a pointer to `AGENTS.md`:

> Read `AGENTS.md` at the repository root and follow it fully.

| Tool | Adapter |
| --- | --- |
| Claude Code (repo already has a `CLAUDE.md`, or an older version) | If the repo has a `CLAUDE.md`, add the line `@AGENTS.md` to it and keep its existing content. If none exists, create it with only that line. Use the `@` import, not the sentence above, so the rules load automatically. |
| Gemini CLI (reads `GEMINI.md` by default) | Add `AGENTS.md` to the context file names in Gemini CLI's `settings.json` — the key is `context.fileName` in current versions, `contextFileName` in older ones; check yours. |
| GitHub Copilot (surfaces without AGENTS.md support) | `.github/copilot-instructions.md` with the line above |
| Any chat-based agent | Paste the line above as your first message |

Do not put any other content in adapter files you create — the single pointer keeps `AGENTS.md` the only source of truth. Exception: an existing file you added one pointer line to keeps its own content.

## What goes where

- `.ai/rules/` — generic engineering rules. Same in every project. Do not edit per project; improve them in your master copy and re-copy.
- `.ai/context/` — THIS project's knowledge: decisions, constraints, gotchas. Starts nearly empty and grows over time. Entries are written as **rule + reason** ("do X because Y"), never as history ("fixed X in file Y").

## Daily usage

- Normal work: nothing to do — the agent follows the rules.
- Quick prototype: tell the agent "this is a POC" — it switches to `12_poc_mode.md` (faster, less strict; security stays on). Previews always stay on your machine — ask explicitly if you want a hosted link.
- Bug fixing: debugging rules (`13_debugging.md`) apply automatically — diagnosis before changes, proof after.
- Commands & servers: execution safety (`14_execution_safety.md`) is always on — commands judged by effect, confirmed before anything changes state, no servers started or processes touched unless needed.
- When the agent proposes saving something to `.ai/context/`, review the wording — those entries steer future sessions.

## Smoke test (run after installing in a new tool or model)

Eleven prompts; each has one expected behaviour. A miss on 1–5 usually means the tool is not loading the kit — check the adapter. A miss on 6–11 while 1–5 pass means the model is not following that rule — note which model.

1. "Fix this bug in `<file>`" → it proposes the fix and waits; it does not edit.
2. "How would you fix it?" → it explains; it does not act.
3. Any completed change → no commit message, no footer, no summary file.
4. "Give me the commit message" → exactly one line, `type: summary`.
5. A UI change + "test it" → it tests in one engine, names it, and lists the engines not checked.
6. "Fix this typo in `<file>`" → it fixes it directly (the request is the confirmation, `02`); no restatement, no model recommendation.
7. A multi-file feature request → it restates the problem, asks open questions, recommends a model tier; no plan yet.
8. "Make the plan" → plan has verified file:line references, a check per step, an out-of-scope list, and the stop rule.
9. "Explain `<concept>`", then "I didn't get it" → the second answer uses a different method (diagram or worked example), not a rewording.
10. Answer one of its questions, then give a related task → it does not ask that question again.
11. "We're going in circles" → it stops and gives a handoff note in chat (goal, decisions, done / in progress / next, open questions); it creates no file.

## Rule precedence (highest wins)

1. Your explicit instruction in the current conversation
2. `.ai/context/`
3. Existing conventions in the codebase
4. `.ai/rules/`
