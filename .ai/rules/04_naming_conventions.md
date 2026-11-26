# Naming Conventions

Priority order — stop at the first level that applies:

1. **Existing project convention.** Match the style of the code you are touching. Always wins.
2. **Official language standard**, where one exists:
   - Python → PEP 8: variables and functions `snake_case`, classes `PascalCase`, constants `SCREAMING_SNAKE_CASE`
   - Java → standard conventions: variables and methods `camelCase`, classes `PascalCase`, constants `SCREAMING_SNAKE_CASE`
3. **User defaults** (JS/TS/CoffeeScript and anything else without a strong standard):
   - variables, object keys → `snake_case`
   - functions → `camelCase`
   - classes → `PascalCase`
   - constants → `SCREAMING_SNAKE_CASE`

## Rules

- If conventions in the repo are mixed or ambiguous, ask the user before introducing new patterns.
- Never perform broad renames solely to enforce style.
