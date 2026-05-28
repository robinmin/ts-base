# AGENTS.md

Guidance for AI coding agents working in this repository. `CLAUDE.md` and `GEMINI.md` symlink here.

## Project

Bun + TypeScript + Biome CLI built on Commander, with shared workspace packages. Turborepo + Bun-workspaces layout:

```
apps/
  cli/          # Commander-based CLI entry (the binary)
packages/
  utils/        # shared utilities (add, zod re-export)
tooling/
  typescript/   # shared tsconfig presets
turbo.json      # Turborepo task graph
```

Workspaces reference each other by the project scope (`@<scope>/*`), set during `bun run setup` from the root `package.json` name.

- **Runtime / package manager / test runner:** Bun `1.3.14`. Prefer `bun:*` APIs over `node:*` unless Bun lacks the API.
- **Lint + format:** Biome `2.4.16`. No ESLint, no Prettier.
- **Build orchestration:** Turborepo `^2.9`.
- **Tool versions:** pinned in `.prototools` via [proto](https://moonrepo.dev/proto). Run `proto use` to install.
- **Git hooks:** Lefthook. **Conventional commits:** cocogitto (`cog`).

Never introduce a new runtime, package manager, linter, or formatter.

## Code style (enforced by `biome.json`)

- 4-space indent, `lineWidth` 120.
- **Single quotes**, semicolons always, trailing commas everywhere.
- `interface` for object shapes, `type` for unions/intersections.
- Imports/exports are auto-sorted by Biome — don't hand-order them.
- `any` is an **error** (`noExplicitAny`). Narrow the type; if unavoidable, justify with `// biome-ignore`.
- TS imports use extensioned specifiers ending in `.js` — `allowImportingTsExtensions` + `moduleResolution: "bundler"`.
- Workspace imports: always use the `@<scope>/*` alias, never deep relative paths into a sibling package.

## Commands

```bash
bun run lint       # biome check + turbo run typecheck  (the gate)
bun run format     # biome check --write                (autofix)
bun run autofix    # format then turbo typecheck
bun run test       # turbo run test (all workspaces)
bun run build      # turbo run build (all workspaces with a build script)
bun run dev        # turbo run dev (watch / runs the CLI)
```

CLI binary: `apps/cli` exposes `bin: { cli: "./src/index.ts" }`. The `.ts` entry runs only under Bun — plain `node` cannot resolve it. After `bun run build`, the bundled binary lives at `apps/cli/dist/index.js`; if you intend to ship the CLI for Node consumers, repoint `bin` to `./dist/index.js` and run `bun run build` before publishing.

## Verification gate (all must pass before "done")

1. `bun run lint` clean — Biome and `turbo run typecheck`.
2. `bun run test` passes; no test skipped, `.skip`'d, or commented out to go green.
3. `bun run build` succeeds across all workspaces that declare a `build` script.
4. `git status` shows only intentional changes.

If a check fails, fix the root cause. **Never** bypass with `--no-verify`, `--force`, or new `biome-ignore` suppressions added solely to silence the gate.

## Testing

- Tests live in `tests/` next to the code (`<workspace>/tests/*.test.ts`), using `bun:test`.
- Coverage target is **line >= 90% and function >= 90% in aggregate** (`coverageThreshold` in `bunfig.toml`).
- Names describe behavior under a condition; assertions tie to the requirement, not the implementation.
- For CLI stdout assertions, spy on `process.stdout.write` (the CLI uses it directly so output is testable without log-format coupling).

## Architecture decision record (binding)

`docs/00_ADR.md` is the **authoritative architecture decision record** for this project. It captures the decisions that define the CLI's shape — the Turborepo + Bun-workspaces layout, the `apps/cli` ⁄ `packages/*` split, Commander as the CLI framework, the `@<scope>/*` workspace-alias boundary, and `process.stdout.write` for testable output. Treat it as a constraint, not a suggestion:

- Read it before any non-trivial change to the workspace graph, the CLI command surface, or cross-package boundaries.
- Changes that contradict a recorded decision require updating the ADR first (add a new dated entry that supersedes the old one) — never silently diverge.
- New cross-cutting architectural choices (a new workspace package, a different CLI framework, a build/publish change) get a new ADR entry in the same file.

## Conventions & boundaries

- Conventional Commits required (`feat:`, `fix:`, `docs:`, `chore:`, ...). Breaking changes go in a `BREAKING CHANGE:` footer.
- Cross-workspace imports use `@<scope>/<pkg>` (workspace aliases), never `../../../packages/...`.
- `vendors/` is reference-only — **never modify** files there.
- Never commit secrets, `.env*`, or credentials. Never edit `.github/workflows/` without approval.
- Surgical changes only: touch what the task needs; no drive-by refactors, no speculative abstractions, no comments that restate what the code already says.
