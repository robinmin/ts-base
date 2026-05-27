# AGENTS.md

Guidance for AI coding agents working in this repository. `CLAUDE.md` and `GEMINI.md` symlink here.

## Project

Bun + TypeScript + Biome starter template. Ships **two modes** side by side; `bun run setup` keeps one and removes the other:

- **Application** (`src-app/`) — a `Bun.serve` HTTP server.
- **Library** (`src-lib/`) — a publishable package (`internal.ts` runtime-agnostic core, `index.ts` Node entry, `browser.ts` browser entry), bundled with tsdown.

After setup the chosen folder becomes `src/`, the other is deleted, and mode-specific scripts/deps/CI are wired into `package.json` and `.github/workflows/`. Once setup has run, treat the repo as a normal single-mode project.

## Toolchain (do not swap)

- **Runtime / package manager / test runner:** Bun `1.3.13`. No npm/pnpm/yarn. Prefer `bun:*` APIs over `node:*` unless Bun lacks the API.
- **Lint + format:** Biome `2.4.16`. No ESLint, no Prettier.
- **Tool versions:** pinned in `.prototools` via [proto](https://moonrepo.dev/proto). Run `proto use` to install. Custom Biome/cog plugins live in `.moon/plugins/`.
- **Git hooks:** Lefthook. **Conventional commits:** cocogitto (`cog`).

Never introduce a new runtime, package manager, linter, or formatter without explicit approval.

## Code style (enforced by `biome.json`)

- 4-space indent, `lineWidth` 120.
- **Single quotes**, semicolons always, trailing commas everywhere.
- `interface` for object shapes, `type` for unions/intersections.
- Imports/exports are auto-sorted by Biome — don't hand-order them.
- `any` is an **error** (`noExplicitAny`). Use precise types; if `any` is unavoidable, narrow it and justify with a `// biome-ignore` line.
- TS imports use extensioned specifiers ending in `.js` (e.g. `import { x } from './foo.js'`) — `allowImportingTsExtensions` + `moduleResolution: "bundler"`.

## Commands

```bash
bun run lint       # biome check + tsc --noEmit  (the gate)
bun run typecheck  # tsc --noEmit only
bun run format     # biome check --write          (autofix)
bun run autofix    # format then type-check
bun run test       # bun test with coverage
```

Mode-specific: app has `start`/`dev`; lib has `build`/`dev` (tsdown) + `size` (size-limit).

## Verification gate (all must pass before "done")

1. `bun run lint` clean — Biome **and** `tsc --noEmit`.
2. `bun run test` passes; no test skipped, `.skip`'d, or commented out to go green.
3. `git status` shows only intentional changes.
4. Lib mode only: `bun run build` succeeds and `bun run size` stays under the limit.

If a check fails, fix the root cause. **Never** bypass with `--no-verify`, `--force`, or new `biome-ignore` suppressions added solely to silence the gate.

## Testing

- Tests live in `tests/` next to the code (`src*/tests/*.test.ts`), using `bun:test`.
- Coverage target is per-file **line ≥ 90% and function ≥ 90%** (`bunfig.toml` sets the aggregate gate; strict per-file is enforced separately).
- Names describe behavior under a condition; assertions tie to the requirement, not the implementation. Inject dependencies (e.g. the RNG in `getRandomId`) to keep tests deterministic.

## Conventions & boundaries

- Conventional Commits required (`feat:`, `fix:`, `docs:`, `chore:`, …). Breaking changes go in a `BREAKING CHANGE:` footer.
- `vendors/` is reference-only — **never modify** files there.
- Never commit secrets, `.env*`, or credentials. Never edit `.github/workflows/` without approval.
- Surgical changes only: touch what the task needs; no drive-by refactors, no speculative abstractions, no comments that restate what the code already says.
- `setup.ts` self-deletes after running; do not re-add `src-app`/`src-lib` once a mode is chosen.
