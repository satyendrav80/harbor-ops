# Execution & Environment Safety

Applies to every command and search the agent runs. Always on. The only two carve-outs are defined elsewhere and are narrow: new code in POC mode (`12_poc_mode.md`) and temporary read-only instrumentation while debugging (`13_debugging.md`). Nothing else relaxes it.

## Search Scope

- Search within the current project. In a multi-project workspace, the widest default scope is the workspace root.
- Never scan beyond the workspace (home directory, disk root, unrelated folders) without first stating the scope, the reason, and the exact command — a direct question does not justify a disk-wide search.
- Prefer targeted searches (known paths, specific patterns) over blanket scans.

## Command Classification — by EFFECT, not by name

The test is always what a command DOES, never what it is called. An unfamiliar command name is not a reason to assume it is safe — judge it by its effect.

- **Read-only** — observes state, changes nothing (list, view, grep, `git status/log/diff`): run freely; briefly state what is being read when it matters.
- **Routine local dev** — non-destructive commands that are part of normal development and touch only build/tooling state, not the user's code or data: building, running the test suite or linters, installing dependencies already declared in the project's manifest. Announce what and why, then run — no wait required.
- **State-changing** — modifies anything the user owns: files, code, data, repo, remote, dependency set, or system config (writing/editing files, version-control writes, migrations, adding new dependencies, config edits, and anything destructive). Before running: explain what and why, show the exact command, and get confirmation (`02_confirmation_workflow.md`).
- **Destructive or irreversible** is the strict end of state-changing (delete, drop, overwrite, force-push, history rewrite, kill processes): fresh explicit confirmation with the exact command shown — always, even if the request implied it.

If you cannot be certain a command is purely read-only, treat it as state-changing and confirm first. The set of harmful commands is open-ended and cannot be fully listed — never rely on a command being individually named here to decide it is safe. Version-control writes follow the git rule in `10_git_and_testing.md`.

## Remote & Server Access

- Treat every remote system (SSH, production DB, cloud CLI/console) as production.
- Read-only diagnostics: announce the target and the exact command before running.
- ANY state-changing command on a remote system: explicit confirmation first, exact command shown, one command at a time — never chained so a destructive step hides inside `&&` or a script.
- Never pipe remote content into a shell (`curl ... | bash`) on any system without confirmation.

## Long-Running Processes

- Anything that keeps running after the command returns (servers, watchers, tunnels, schedulers) changes the user's environment for as long as it lives. Do not start one unless the task needs it; if you do, say what was started and how to stop it.
- Never stop, restart, or re-bind a process you did not start in this session — it may be the user's.

## Nothing Leaves the Machine

- Anything the user asks to see or try — prototype, preview, mock, script, generated page — is built and served locally (a local file or a local server). It is never uploaded, published, hosted, or shared through any external service (artifact/preview hosting, sandboxes, pastebins, share links), even when the tool offers this as a convenience.
- Code, data, and UI leave the user's machine only when the user explicitly asks for a hosted link, in that conversation. A request to "show me" or "let me see it" is a request for a local preview, never for publishing.

## Generated & Vendored Files

- Files produced by a tool (build output, dependencies, lockfiles, generated code) are edited only through the tool that produces them — never by hand.

## Machine-Level Changes

- No global installs, system config edits, or environment changes outside the project without stating it and getting confirmation.
