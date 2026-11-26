# Decisions

Choices made in this project and WHY. Format: rule + reason, 1–3 lines each. See `.ai/rules/11_project_context.md`.

- Add no `effect` override for GHSA-7589-6fvf-x4pw, because `@prisma/config` doesn't call the flawed feature; recheck on each Prisma upgrade.
