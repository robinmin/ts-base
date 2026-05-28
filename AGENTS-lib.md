# AGENTS.md

Guidance for AI coding agents working in this repository. `CLAUDE.md` and `GEMINI.md` symlink here.

## Project

Bun + TypeScript + Biome library. Flat single-package layout — `src/` is the source root, `tests/` sits alongside.

- **Entry points:** `src/internal.ts` (runtime-agnostic core), `src/index.ts` (Node/Bun, uses `node:crypto`), `src/browser.ts` (browser, uses Web Crypto). Bundled with tsdown to `dist/`.
- **Package manager / test runner:** Bun `1.3.14`. No npm/pnpm/yarn.
- **Lint + format:** Biome `2.4.16`. No ESLint, no Prettier.
- **Tool versions:** pinned in `.prototools` via [proto](https://moonrepo.dev/proto). Run `proto use` to install.
- **Git hooks:** Lefthook. **Conventional commits:** cocogitto (`cog`).
- **Release:** release-please + npm + JSR (`.github/workflows/release-please.yml`).

Never introduce a new runtime, package manager, linter, or formatter.

## Code style (enforced by `biome.json`)

- 4-space indent, `lineWidth` 120.
- **Single quotes**, semicolons always, trailing commas everywhere.
- `interface` for object shapes, `type` for unions/intersections.
- Imports/exports are auto-sorted by Biome — don't hand-order them.
- `any` is an **error** (`noExplicitAny`). Narrow the type; if unavoidable, justify with `// biome-ignore`.
- TS imports use extensioned specifiers ending in `.js` (e.g. `import { x } from './foo.js'`) — `allowImportingTsExtensions` + `moduleResolution: "bundler"`.

## Commands

```bash
bun run lint       # biome check + tsc --noEmit  (the gate)
bun run typecheck  # tsc --noEmit only
bun run format     # biome check --write          (autofix)
bun run autofix    # format then type-check
bun run test       # bun test with coverage
bun run build      # tsdown bundle to dist/ (Node + browser entries)
bun run dev        # tsdown --watch (rebuild on change)
bun run size       # size-limit check against the browser bundle
```

## Verification gate (all must pass before "done")

1. `bun run lint` clean — Biome **and** `tsc --noEmit`.
2. `bun run test` passes; no test skipped, `.skip`'d, or commented out to go green.
3. `bun run build` succeeds.
4. `bun run size` stays under the configured limit.
5. `git status` shows only intentional changes.

If a check fails, fix the root cause. **Never** bypass with `--no-verify`, `--force`, or new `biome-ignore` suppressions added solely to silence the gate.

## Testing

- Tests live in `tests/` next to the code (`src/tests/*.test.ts`), using `bun:test`.
- Coverage target is **line >= 90% and function >= 90% in aggregate** (`coverageThreshold` in `bunfig.toml`).
- Names describe behavior under a condition; assertions tie to the requirement, not the implementation. Inject dependencies (e.g. the RNG in `getRandomId`) to keep tests deterministic.

## Architecture decision record (binding)

`docs/00_ADR.md` is the **authoritative architecture decision record** for this project. It captures the decisions that define the library's shape — the three-entry split (`internal.ts` runtime-agnostic core, `index.ts` Node, `browser.ts` browser), the tsdown bundle to `dist/`, the dual npm + JSR release flow, the dependency-injected RNG for testability. Treat it as a constraint, not a suggestion:

- Read it before any non-trivial change to the entry-point split, the runtime-agnostic boundary, or the bundling/release config.
- Changes that contradict a recorded decision require updating the ADR first (add a new dated entry that supersedes the old one) — never silently diverge.
- New cross-cutting architectural choices (a new entry point, an added runtime dependency, a new export surface) get a new ADR entry in the same file.

## Conventions & boundaries

- Conventional Commits required (`feat:`, `fix:`, `docs:`, `chore:`, ...). Breaking changes go in a `BREAKING CHANGE:` footer; release-please drives versioning.
- Keep `src/internal.ts` runtime-agnostic — no `node:*` or browser-only APIs there. Put Node-only code in `index.ts`, browser-only in `browser.ts`.
- `vendors/` is reference-only — **never modify** files there.
- Never commit secrets, `.env*`, or credentials. Never edit `.github/workflows/` without approval.
- Surgical changes only: touch what the task needs; no drive-by refactors, no speculative abstractions, no comments that restate what the code already says.
