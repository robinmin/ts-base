# AGENTS.md

Guidance for AI coding agents working in this repository. `CLAUDE.md` and `GEMINI.md` symlink here.

## Project

Bun + TypeScript + Biome application. Flat single-package layout — `src/` is the source root, `tests/` sits alongside.

- **Runtime:** `Bun.serve` HTTP server. Prefer `bun:*` APIs over `node:*` unless Bun lacks the API.
- **Package manager / test runner:** Bun `1.3.14`. No npm/pnpm/yarn.
- **Lint + format:** Biome `2.4.16`. No ESLint, no Prettier.
- **Tool versions:** pinned in `.prototools` via [proto](https://moonrepo.dev/proto). Run `proto use` to install.
- **Git hooks:** Lefthook. **Conventional commits:** cocogitto (`cog`).

Never introduce a new runtime, package manager, linter, or formatter.

## Code style (enforced by `biome.json`)

- 4-space indent, `lineWidth` 120.
- **Single quotes**, semicolons always, trailing commas everywhere.
- `interface` for object shapes, `type` for unions/intersections.
- Imports/exports are auto-sorted by Biome — don't hand-order them.
- `any` is an **error** (`noExplicitAny`). Narrow the type; if unavoidable, justify with `// biome-ignore`.
- TS source imports use extensionless relative specifiers (e.g. `import { x } from './foo'`). Library builds patch emitted `dist/*.js` after `tsc`.

## Commands

```bash
bun run lint       # biome check + tsc --noEmit  (the gate)
bun run typecheck  # tsc --noEmit only
bun run format     # biome check --write          (autofix)
bun run autofix    # format then type-check
bun run test       # bun test with coverage
bun run start      # bun run src/index.ts
bun run dev        # bun --watch run src/index.ts
```

## Verification gate (all must pass before "done")

1. `bun run lint` clean — Biome **and** `tsc --noEmit`.
2. `bun run test` passes; no test skipped, `.skip`'d, or commented out to go green.
3. `git status` shows only intentional changes.
4. `bun run start` launches without error (smoke test).

If a check fails, fix the root cause. **Never** bypass with `--no-verify`, `--force`, or new `biome-ignore` suppressions added solely to silence the gate.

## Testing

- Tests live in `tests/` next to the code (`src/tests/*.test.ts`), using `bun:test`.
- Coverage target is **line >= 90% and function >= 90% in aggregate** (`coverageThreshold` in `bunfig.toml`). Per-file thresholds are not enforced by Bun yet — review per-file coverage at PR time.
- Names describe behavior under a condition; assertions tie to the requirement, not the implementation. Inject dependencies to keep tests deterministic.

## Architecture decision record (binding)

`docs/00_ADR.md` is the **authoritative architecture decision record** for this project. It captures the decisions that define the application's shape — the flat single-package layout, `Bun.serve` as the HTTP runtime, the zod-validated config boundary, the zero-dependency Bun SQL data pattern. Treat it as a constraint, not a suggestion:

- Read it before any non-trivial change to the server entry, config loading, or data access.
- Changes that contradict a recorded decision require updating the ADR first (add a new dated entry that supersedes the old one) — never silently diverge.
- New cross-cutting architectural choices (a router, a DI container, a new runtime boundary) get a new ADR entry in the same file.

## Conventions & boundaries

- Conventional Commits required (`feat:`, `fix:`, `docs:`, `chore:`, ...). Breaking changes go in a `BREAKING CHANGE:` footer.
- `vendors/` is reference-only — **never modify** files there.
- Never commit secrets, `.env*`, or credentials. Never edit `.github/workflows/` without approval.
- Surgical changes only: touch what the task needs; no drive-by refactors, no speculative abstractions, no comments that restate what the code already says.
