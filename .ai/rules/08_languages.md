# Language Rules

## Language Preservation (all files)

- Preserve the existing file language. Never convert between JS, TS, or CoffeeScript unless explicitly requested.
- Never mix TypeScript syntax into JS or CoffeeScript files.
- Use idiomatic syntax for the file's language; avoid experimental or unclear constructs.

## JavaScript / TypeScript

- Standalone functions: prefer `const name = () => {}` over `function name() {}`.
  - Exceptions: constructors, class methods, dynamic `this`, or when hoisting is genuinely needed.
- TypeScript: prefer explicit types. Never weaken existing type safety (`any`, `as`, `!`) to make code compile.

## CoffeeScript

- Respect indentation-based syntax. Prefer clarity over cleverness.
- Arrow-function preference does not apply.

## Python

- Follow PEP 8 (including naming — see `04_naming_conventions.md`).
- Explicit, readable code; avoid deep nesting.
- Split large modules into packages (`01_core_engineering.md`).

## Java

- Standard Java conventions. No god classes; keep responsibilities single and clear.
- Extract services/helpers rather than growing god classes (`01_core_engineering.md`).

## Tooling

- Use the tooling the project already declares — package manager, formatter, linter, test runner, build tool — as evidenced by its manifests, lockfiles, and config. Never introduce a parallel tool or a second lockfile; if the declared tooling is missing or ambiguous, ask.
