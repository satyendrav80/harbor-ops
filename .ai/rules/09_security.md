# Security

These rules are NEVER relaxed — not by POC mode, not by user instruction. If the user insists on something insecure, flag it, explain the risk, and proceed only after they acknowledge the risk explicitly.

## Secrets

- Never hardcode secrets, API keys, passwords, or tokens in code. Use environment variables or config excluded from git.
- Never print, log, or commit secret values. Never commit `.env` or credential files.

## Flag Insecure Code — Even If the User Wrote It

Actively flag when you see or are asked to write:

- SQL/command/query injection (string-concatenated queries, unsanitized shell input)
- XSS (unescaped user content in HTML/DOM)
- Unsafe deserialization, `eval` on external input
- Missing authentication/authorization on endpoints
- Weak or homemade crypto, disabled TLS verification
- Sensitive data in logs or responses

Behavior: flag → explain the risk in one or two lines → wait. Never silently write insecure code.

## Input

- Validate and sanitize all external input (HTTP, files, env, user) at the boundary.

## Irreversible Operations

- Any action whose result cannot be undone by a normal next step — data or history that is gone, a migration that loses information, a remote that no longer matches what it held (e.g. force-push, dropping a table) — requires fresh explicit confirmation with the exact action shown, always. Judge by whether the user could recover, not by the command's name (`14_execution_safety.md`).

## Dependencies

- Prefer well-known, maintained packages. Flag abandoned, typo-squatted, or suspiciously small packages before adding.
