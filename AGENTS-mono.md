# AGENTS.md

Guidance for AI coding agents working in this repository. `CLAUDE.md` and `GEMINI.md` symlink here.

## Project

Bun + TypeScript + Biome monorepo (Turborepo + Bun-workspaces). Layout:

```
apps/
  server/       # Hono on Bun.serve, exposes /health + /rpc (oRPC over Hono)
  web/          # Vite + React 19, oRPC client
  cli/          # Bun CLI, oRPC client
packages/
  api/          # shared oRPC contracts + types (planet schema)
  config/       # zod-based configuration
  db/           # Bun native SQL data access
  utils/        # shared utilities + zod re-export
tooling/
  typescript/   # shared tsconfig presets (base/server/react)
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
bun run build      # turbo run build (server bundle, web Vite build, cli bundle)
bun run dev        # turbo run dev (parallel: server + web + cli)
```

Default dev ports: server `3000`, web `5173`. The web client reads `VITE_API_URL` (falls back to `http://localhost:3000/rpc`); the CLI reads `API_URL`. See each app's `.env.example`.

CLI binary: `apps/cli` exposes `bin: { cli: "./src/index.ts" }` — the `.ts` entry runs only under Bun. To ship for Node consumers, repoint `bin` to `./dist/index.js` and run `bun run build` before publishing.

## Verification gate (all must pass before "done")

1. `bun run lint` clean — Biome and `turbo run typecheck`.
2. `bun run test` passes; no test skipped, `.skip`'d, or commented out to go green.
3. `bun run build` succeeds across all workspaces with a `build` script.
4. `git status` shows only intentional changes.

If a check fails, fix the root cause. **Never** bypass with `--no-verify`, `--force`, or new `biome-ignore` suppressions added solely to silence the gate.

## Testing

- Tests live in `tests/` next to the code (`<workspace>/tests/*.test.ts`), using `bun:test`.
- Coverage target is **line >= 90% and function >= 90% in aggregate** (`coverageThreshold` in `bunfig.toml`).
- Names describe behavior under a condition; assertions tie to the requirement, not the implementation.
- Server in-memory stores must expose a test-only reset (e.g. `_resetPlanets()`) and reset in `beforeEach` — never rely on test-file ordering.

## oRPC conventions

- Contracts live in `packages/api/src/contracts/*` and are the single source of truth.
- Server procedures (`apps/server/src/procedures/*`) implement contracts via `implement(planetContract)`.
- Throw `ORPCError('NOT_FOUND', { message })` etc. for typed errors — never generic `Error` (status codes and client discrimination rely on it).
- Clients (`apps/web`, `apps/cli`) consume only the contract types; never reach into server internals.

## Architecture decision record (binding)

`docs/00_ADR.md` is the **authoritative architecture decision record** for this project. It captures the decisions that define the monorepo's shape — the Turborepo + Bun-workspaces layout, the `apps/{server,web,cli}` ⁄ `packages/{api,config,db,utils}` split, oRPC contracts in `packages/api` as the single source of truth for end-to-end type safety, Hono on `Bun.serve` for the server, and the `@<scope>/*` workspace-alias boundary. Treat it as a constraint, not a suggestion:

- Read it before any non-trivial change to the workspace graph, the oRPC contract layer, the server transport, or cross-package boundaries.
- Changes that contradict a recorded decision require updating the ADR first (add a new dated entry that supersedes the old one) — never silently diverge.
- New cross-cutting architectural choices (a new app or package, a different RPC/transport layer, a real DB swap, an auth boundary) get a new ADR entry in the same file.

## Conventions & boundaries

- Conventional Commits required (`feat:`, `fix:`, `docs:`, `chore:`, ...). Breaking changes go in a `BREAKING CHANGE:` footer.
- Cross-workspace imports use `@<scope>/<pkg>` (workspace aliases), never `../../../packages/...`.
- `vendors/` is reference-only — **never modify** files there.
- Never commit secrets, `.env*`, or credentials. Never edit `.github/workflows/` without approval.
- Surgical changes only: touch what the task needs; no drive-by refactors, no speculative abstractions, no comments that restate what the code already says.
