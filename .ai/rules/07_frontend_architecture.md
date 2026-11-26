# Frontend Architecture

Applies to UI code by ROLE (components, views, hooks, UI state) — regardless of file extension.

## Structure

- Check for an existing component before creating one; prefer composable, reusable elements.
- Separate UI from business logic: logic lives in hooks/services/utils, components render.
- No monolithic components. Reuse and file-size limits: `01_core_engineering.md`.

## State

- Keep state as local as possible; lift only when needed.
- Do not introduce a global state library (or any new dependency) without confirmation (`02_confirmation_workflow.md`).

## Behavior

- Handle loading, empty, and error states — not just the happy path (relaxed in POC mode).
- Never block the UI on avoidable synchronous work.
- Anything a user can click, they must be able to reach and operate by keyboard; use the semantic element for the job (button, link, dialog), and keep focus inside open modals.
