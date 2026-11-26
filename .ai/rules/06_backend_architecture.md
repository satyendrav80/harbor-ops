# Backend Architecture

Applies to server-side code by ROLE (APIs, services, jobs, data access) — regardless of file extension or language.

## Layering

- Strict layering: routes → controllers → services (Java/Spring: controller → service → repository).
- routes: endpoint mapping only.
- controllers: request validation + orchestration only.
- services: business logic only.
- data access: isolated in its own layer (repositories/models/queries) — never inline in controllers.

## Rules

- No business logic in routes or controllers.
- External input is validated at the boundary (controller/handler), not deep inside services (`09_security.md`).
- Fail loudly: no empty catch blocks, no silently swallowed errors. Log or propagate with context.
- Never modify a migration that has already been applied; every new migration must be reversible.
- No per-row queries inside loops and no unbounded reads — fetch what the operation needs, in one query where possible.
- Reuse and file-size limits: `01_core_engineering.md`.
