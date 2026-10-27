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
- **MVC mindset**: models = domain/data, controllers = orchestration,
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

CI runs on every PR and push to `main`, as separate checks: **practices**,
**lint**, **test**, **build**, **e2e** (plus the **Mac and Windows app** builds when their files change).

`npm run check:practices` (`scripts/check-practices.mjs`) enforces:
- one stylesheet per component (`Foo.tsx` → `Foo.css`; a few style-less
  components are listed as exempt)
- components at most 250 lines (`App.tsx` has a temporary, capped exception
  until it's split)
- no duplicated 20-line blocks of code (DRY)

`npm run test:e2e` runs the Playwright smoke tests in Chromium and WebKit
(the Mac app's engine). Locally, run it only when debugging e2e (see Tests).


## Dependency updates

Dependabot (`.github/dependabot.yml`) keeps the noise down:
- **GitHub Actions:** one grouped PR a month with every new action version.
- **npm:** no routine version bumps; only security fixes, grouped into one PR.
- **Which vulnerabilities count:** repo Settings → Advanced Security →
  Dependabot rules auto-dismisses low and medium severity alerts, so only
  high and critical ones open PRs. (Dependabot security updates must be on.)
- Rust crates aren't covered: there's no committed `Cargo.lock` for it to read.
