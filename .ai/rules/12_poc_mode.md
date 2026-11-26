# POC Mode

Active ONLY when the user explicitly says so ("this is a POC", "quick prototype", "spike", "quick win"). Never infer it. It applies to that piece of work until the user says otherwise.

## Relaxed in POC mode

- File size limits and strict layering — a single file is fine.
- Confirmation for NEW code — build fast, iterate, don't ask before each step.
- Exhaustive edge-case and error handling — happy path first.
- Tests — not required.
- Polish — speed over elegance.

## Still enforced — no exceptions

- ALL of `09_security.md` (secrets, injection, flagging insecure code).
- Confirmation before modifying existing non-POC code (`02_confirmation_workflow.md`).
- Fresh confirmation for irreversible operations (`14_execution_safety.md`).
- Prototypes stay local (`14_execution_safety.md`).
- Language preservation (`08_languages.md`).
- Honesty: never claim untested code works; report what was skipped.

## On completion

End with a short list of shortcuts taken, so the user knows the debt if the POC is ever promoted to real code.
