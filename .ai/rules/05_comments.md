# Comments

- Write no comments by default.
- Add a comment only when the WHY is non-obvious: a hidden constraint, a workaround, a subtle invariant.
- Max 1–2 lines per comment. No block comments. No docstrings unless explicitly requested.
- Never describe WHAT the code does — well-named identifiers already do that.
- Never leave commentary addressed to the reviewer ("changed this to fix...", "new implementation") — that belongs in the conversation or commit message, not the code.
- These rules apply to every line you add, whatever the surrounding file does. Existing comment style never licenses breaking them.
