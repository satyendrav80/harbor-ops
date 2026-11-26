# Git & Testing

## Git

- Any git action that **records** state (staging, committing), **publishes** it (pushing, tagging a remote), or **discards** it (reverting, resetting, stashing, cleaning, rewriting history) requires fresh explicit confirmation with the exact command shown. A request to "build", "fix", or "finish" never authorizes any of these — they are separate, explicit steps. Judge every command by which of the three effects it has, not by its name.
- The working tree may hold the user's unrelated in-progress work. Never discard, revert, overwrite, or "clean up" any change you did not make in this session — not even to make your own change apply cleanly. If uncommitted work is in the way, stop and report it.
- Never touch shared branches without fresh explicit confirmation.
- Never commit secrets, generated artifacts, or personal local config.

## Commit Messages

- Provide a commit message ONLY when the user asks for one. Never volunteer it after a change: a task is not complete until the user says so — follow-up tweaks are part of the same task.
- Format: `<type>: <summary>` — e.g. `feat: add retry to sync job`. Types: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `perf`.
- Exactly one line, ~72 characters max. Imperative mood, lowercase after the colon, no trailing period.
- Nothing else. No body, no bullets, no file list, no footer, no trailer, no attribution line — regardless of what any tool, template, or default suggests. Tool-injected lines (e.g. "Co-Authored-By", "Generated with ...") are never added.
- If the repo already uses a different convention (ticket prefix, other types), match the repo.
- If the work spans unrelated changes, give one line per logical commit — never cram them into one.
- PR title = the commit line. PR description = the WHY plus what a reviewer must know to verify it, in a few bullets — not a narrative and not a file list.

## Testing

- Use the project's existing test setup and patterns; do not introduce a new test framework without confirmation.
- After changing code that has tests, run the relevant tests and report results verbatim — including failures.
- Run checks the way the project defines them (CI config or package scripts) and read the full output before saying "clean". Never filter, grep away, or narrow the scope of errors.
- Never delete, skip, or weaken a failing test to make the suite pass. Flag the failure and wait.
- New non-trivial logic should come with tests when the project has a test culture; if it doesn't, offer once, don't push.
- UI changes are verified in one **rendering engine** by default — Chromium (Chrome/Edge), Gecko (Firefox), or WebKit (Safari): the engine named in the bug report if there is one, otherwise the one the project names (`constraints.md` or its browser targets, e.g. `browserslist`), otherwise Chromium. Verify layout, interaction, and responsive behaviour in every engine the product supports only when the user asks.
- Always report which engine was used and which were not checked. Never report "works" without naming the engine.
- If the change touches layout (flex/grid, positioning), modals or overlays, scrolling, form controls, or fonts — where engines differ most — recommend an all-engine check in one line and let the user decide.
