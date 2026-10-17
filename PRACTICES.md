# Software Development Practices

> **This file is yours.** Edit it anytime to change how I work. I read it before writing
> code and follow it. If anything here conflicts with a request, I'll ask.

## Code style

- **DRY** — no copy-paste logic; factor shared behavior into helpers/services.
- **KISS** — simplest thing that works; no speculative abstraction or over-engineering.
- **Clean & readable** — clear intent over cleverness.
- **Well-named** variables and functions; names describe what/why.
- **Short functions and files** — each does one thing; split when they grow.
- **Helpers and services** for reusable logic; keep components/controllers thin.
- **MVC mindset** (Rails-style): models = domain/data, controllers = orchestration,
  views = presentation.

## Comments

- Only comment when it adds real value (the "why", not the "what").
- No convoluted or redundant comments.
- Don't comment on things nobody would expect anyway (e.g. "flagging doesn't
    reorder"). Explain surprising behavior, not the absence of it.

## Error handling

- **Silence is bad.** Never swallow errors or failures without a trace.
- Always log a clear, actionable error when something goes wrong (what failed,
  where, and why), even when we recover with a fallback value.
- Prefer surfacing errors to the user where they can act on them (e.g. invalid
  formula in the authoring UI) over silently returning a default.
- Crash-safe is not the same as silent: stay non-throwing at runtime, but make
  the failure visible.

## Tests

- Write tests for engine/logic (formulas, pivot, services).
- Prefer small, focused unit tests with clear names.
- Default workflow: do not run local e2e routinely; rely on CI e2e as the
  enforcement gate. Run local e2e only when actively debugging a failing e2e
  scenario.

## UI

- One stylesheet per component. Clean, uncluttered look.
- Edit view resembles a spreadsheet (Excel-like). Saved view resembles a polished web page.
- Prefer small, shareable/reusable UI components whenever possible.

## Process

- Work on branches; open PRs; never push to `main` without review.
- **Stop and ask** whenever any question or clarification comes up, at any
    point in any task (coding, reviewing, planning). Never guess and continue.
    This applies to every agent and every skill used in this repo.
- Use latest Node / React / Vite (and keep deps permissively licensed).
- When PR feedback reveals coding-style preferences, record them in this file
    before continuing so future work follows the updated style.
- `docs/TODO.md` is the source of truth for status/progress.
    Keep it current as tasks move through `todo` -> `wip` -> `in-pr` -> `in-main`.
- Every PR that includes frontend/UI changes must include localhost preview
    instructions in the PR description:
    - run command (for example `npm run dev`)
    - local URL (for example `http://localhost:6060`)
- Merge rule: lint + test + build CI checks must be green before merging.
- While iterating on MVP behavior, it is OK to skip running local lint/test/practices checks, but do not merge until CI lint + test + build checks are green.


## Toolchain

- Node >=22 required (declared in `engines.node`). Run `nvm use` (reads
  `.nvmrc`) before `npm run test` / `lint` / `build`.

## Add your own rules below

<!-- e.g. "prefer named exports", "no default exports", "max 200 lines per file" -->

## CI-enforced subset

- `npm run check:practices` runs in CI on every PR/push.

