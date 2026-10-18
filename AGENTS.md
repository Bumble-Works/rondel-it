# Agent rules for Rondel It

These rules apply to any coding agent or LLM tool (Claude, Copilot, Codex, Cursor, ...).

Read these before doing any work:

- `PRACTICES.md`: how we write code, test, and ship. It is the source of truth for working rules.
- `PLAN.md`: the product vision.
- `docs/FUNCTIONALITY.md`: how the app is **meant** to behave. Anything that
  differs is a bug. When you change behavior, update it in the same change.
- `Plan1.md`: the Stage 1 engineering spec (temporary; deleted once done).

## Commit locally; the human pushes

Work on a branch off the latest `main` and **commit locally only**. Don't push,
open pull requests, or post on GitHub. The user reviews locally, then pushes
and opens the PR. When work is ready, say what it does and how to try it
(`npm run dev` → http://localhost:1420), after lint, tests and build pass.

## Always stop and ask

If any question or clarification comes up, at any point in any task, stop and
ask the user before continuing. Don't guess. This includes:

- requirements that are ambiguous or conflict with each other
- code that diverges from `PLAN.md` / `Plan1.md` when it's unclear whether that was intended
- any action that is destructive or outward-facing

This rule applies to every tool, skill and subagent used in this repo.
