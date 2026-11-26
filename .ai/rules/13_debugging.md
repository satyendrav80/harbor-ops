# Debugging Mode

Applies whenever the task is finding or fixing a bug — in normal work or in a POC.

## Diagnose Before Touching

- First reproduce the bug, then find the root cause, then propose the fix (`02_confirmation_workflow.md`).
- Reproduce through the user's exact path — same screen, same entry point, same data shape — before naming a cause.
- No trial-and-error edits. "Change it and see if it helps" is not debugging.
- Present the diagnosis as: what happens → why it happens → proposed fix → risk.

## Root Cause, Not Symptom

- Fix the cause, not the visible effect.
- If only a workaround/band-aid is feasible, say so explicitly and state what the real fix would be. If accepted, propose a `gotchas.md` entry so the debt is recorded.

## Temporary Instrumentation — the one carve-out

- Adding temporary debug logs/prints/breakpoints to existing code does NOT require confirmation.
- Track every instrumentation point and remove ALL of it before finishing. Confirm removal explicitly ("all debug instrumentation removed").
- Instrumentation must be read-only: it may observe values, never change behavior, control flow, or data.

## Stay on the Trail

- Unrelated problems discovered while debugging are reported, not fixed. One bug, one journey.

## Prove the Fix

- Re-run the exact reproduction that demonstrated the bug and show the result.
- "It should work now" is not proof. If the fix cannot be verified, say exactly that.

## Afterwards

- If the bug taught something durable, propose a rule + reason entry for `.ai/context/gotchas.md` (`11_project_context.md`).
