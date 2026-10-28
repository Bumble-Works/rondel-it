# Software Development Practices

Code and testing standards for Rondel It. Agent workflow is in [AGENTS.md](AGENTS.md).

## Code

- Keep code simple, readable and well named; avoid speculative abstractions.
- Share repeated logic through focused helpers and services.
- Keep functions and files short, with one clear responsibility.
- Extract components for a clear responsibility or reuse; keep trivial single-use
  helpers with their owner so routine edits stay local.
- Separate domain/data rules, orchestration and presentation; keep components thin.
- Comment on useful context and surprising behavior rather than restating the code.

## Errors

- Log failures with enough context to identify what failed and why.
- Surface actionable errors to the user, including when recovering with a fallback.
- Keep runtime recovery safe without silently hiding failures.

## Tests

- Test domain rules, reporting and services with small, focused tests.
- Use clear test names that describe behavior.
- Lint, tests and build must pass before merging.

## UI

- Use one stylesheet per component.
- Keep a component's screen and print rules together. Document-wide print rules
  belong to the print document; chart and table rules belong to those components.
- Keep the interface clean and uncluttered, with reusable components where useful.

## Documentation

- Write for the person using the document. Make each explanation clear in its
  context, brief, and easy to understand; explain necessary technical terms in
  plain language.
- Keep README.md limited to the essentials for getting the app running and a
  very high-level architecture overview. Routine refactors should not require
  README changes; keep feature internals and refactor notes out of it.
- `docs/FUNCTIONALITY.md` is a concise user guide. Explain how features work
  without repeating information or tiring the reader with unnecessary detail.

## Toolchain

- Node 22+ is required; use the version pinned in `.nvmrc`.
- Keep Node, React and Vite current, with permissively licensed dependencies.

## Dependency updates

- Dependabot groups GitHub Actions updates monthly. npm updates are security
  fixes only; repository settings dismiss low and medium alerts.
- Rust dependency updates are manual; there is no committed Cargo.lock.

## CI checks

CI runs practices, lint, unit/component tests, build and browser tests. Desktop
builds also run when their files change. Playwright covers Chromium and WebKit.

`npm run check:practices` enforces only these mechanical rules:

- Components have a matching stylesheet, with a small explicit exemption list.
- Components stay within 250 lines, except for App.tsx's capped allowance.
- Source files contain no duplicated 20-line blocks.

The remaining standards require code review, including whether documentation is
clear, relevant to its audience, and concise.
