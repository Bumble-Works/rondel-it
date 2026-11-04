# Agent rules for Rondel It

These rules apply to any coding agent or LLM tool (Claude, Copilot, Codex, Cursor, ...).

Read these before doing any work:

- `PRACTICES.md`: code, testing and dependency standards.
- `README.md`: setup, architecture and remaining TODO ideas.
- `docs/FUNCTIONALITY.md`: how the app is **meant** to behave. Anything that
  differs is a bug. When you change behavior, update it in the same change.

## Leave commits and publishing to the human

Work on a branch off the latest `main`, or the requested PR when stacking work.
Leave changes uncommitted. Don't push, open pull requests or post on GitHub.
When work is ready, say what it does and how to try it
(`npm run dev` → http://localhost:1420), after lint, tests and build pass.

Run `nvm use` before checks. Leave routine browser tests to CI; run local e2e
only when debugging a failing scenario. If asked to draft a PR description for
UI changes, include the preview command and URL.

## Maintain the docs

- Keep unfinished ideas in README.md's TODO list as short, clear bullets.
  Remove completed items; don't add progress logs or separate plans.
- Keep `docs/FUNCTIONALITY.md` a concise user manual with one explanation per
  feature. Put setup and essential technical context in README.md.
- Record coding-style preferences from review feedback in `PRACTICES.md`.

## Uphold framework and language standards

Push for the idiomatic, standard way of doing things in the language or framework
in use (Tauri, React, TypeScript, Rust, ...). If a user's request or decision
diverges from the accepted standard or best practice, say so and explain why
before implementing it. Don't silently follow a non-standard choice to avoid
friction — surface the tradeoff, recommend the conventional approach, and let the
user make an informed call. This matters most when the author is new to the
stack and relying on you to flag what "done right" looks like.

## Always stop and ask

If any question or clarification comes up, at any point in any task, stop and
ask the user before continuing. Don't guess. This includes:

- requirements that are ambiguous or conflict with each other
- code that diverges from `docs/FUNCTIONALITY.md` when it's unclear whether that was intended
- any action that is destructive or outward-facing

This rule applies to every tool, skill and subagent used in this repo.
