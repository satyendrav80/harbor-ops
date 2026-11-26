# Gotchas

Non-obvious traps learned the hard way. Format: rule + reason, 1–3 lines each. See `.ai/rules/11_project_context.md`.

- Reinstall from a deleted `package-lock.json` after dependency upgrades, because the lockfile is gitignored and old indirect versions can survive `npm install`.
