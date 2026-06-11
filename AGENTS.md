# AGENTS.md

Guidance for AI coding agents working in this repository. `CLAUDE.md` and `GEMINI.md` symlink here.

## Project

`ts-base` is a Bun + TypeScript + Biome project-template and agent-tooling workbench. It has two explicit flows:

- **Divergence:** generate a new project from curated app, lib, cli, or monorepo scaffolds.
- **Convergence:** absorb reusable agent capabilities, commands, workflow conventions, and quality practices from selected source projects after review.

The repository still ships **four modes** side by side; `bun run setup` keeps one and removes the rest:

- **Application** (`src-app/`) — a `Bun.serve` HTTP server. Flat single-package layout → `src/`.
- **Library** (`src-lib/`) — a publishable package (`internal.ts` runtime-agnostic core, `index.ts` Node entry, `browser.ts` browser entry), built with `tsc` plus the Bun dist ESM extension fixer. Flat single-package layout → `src/`.
- **CLI** (`src-cli/`) — a Turborepo + Bun-workspaces layout with a Commander-based CLI in `apps/cli` and shared `packages/{config,utils}`. Promoted to the repo root on setup.
- **Monorepo** (`src-monorepo/`) — a Turborepo + Bun-workspaces layout promoted to the repo root: `apps/{server,web,cli}` and `packages/{api,config,db,utils}`. Workspaces reference each other by the project scope (`@<scope>/*`), derived from the root `package.json` name; the `@SCOPE/` placeholder in every `package.json` and `.ts`/`.tsx` source file is rewritten in place.

After setup the chosen layout is promoted, the other scaffolds are deleted, and mode-specific scripts/deps/CI are wired into `package.json` and `.github/workflows/`. Once setup has run, treat the repo as a normal single-mode project.

Convergence work must be review-first. Imported skills, commands, configs, or enhancements are proposed as classified candidates and applied only after explicit confirmation.

## Direction Docs

- `docs/00_ADR.md` — architecture decisions for the template/tooling direction.
- `docs/01_PRD.md` — product brief, target users, scope, non-goals, and success criteria.
- `docs/03_ARCHITECTURE.md` — architecture overview, flows, boundaries, and component design.

Update these files when changing project direction, workflow contracts, or architecture.

## Toolchain (do not swap)

- **Runtime / package manager / test runner:** Bun `1.3.14`. No npm/pnpm/yarn. Prefer `bun:*` APIs over `node:*` unless Bun lacks the API.
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
- TS source imports use extensionless relative specifiers (e.g. `import { x } from './foo'`). Published library builds run `scripts/fix-dist-esm-extensions.ts` to patch emitted `dist/*.js` for Node-compatible ESM.

## Commands

```bash
bun run lint       # biome check + tsc --noEmit  (the gate)
bun run typecheck  # tsc --noEmit only
bun run format     # biome check --write          (autofix)
bun run autofix    # format then type-check
bun run test       # bun test with coverage
bun run spur-check # lint + Spur pre-check + test + Spur post-check
```

Mode-specific: app has `start`/`dev`; lib has `build` (`tsc` + Bun dist extension fixer) and `smoke:dist`; cli and monorepo proxy `dev`/`build`/`test`/`typecheck` through `turbo run …` across all workspaces (root pins `packageManager` so Turbo can resolve them).

## Verification gate (all must pass before "done")

1. `bun run lint` clean — Biome **and** `tsc --noEmit`.
2. `bun run test` passes; no test skipped, `.skip`'d, or commented out to go green.
3. For changes touching architecture, template policy, or convergence rules, run `bun run spur-check` when Spur is available.
4. `git status` shows only intentional changes.
5. Lib mode only: `bun run build` and `bun run smoke:dist` succeed.
6. CLI / Monorepo mode only: `bun run build` (turbo) succeeds across all workspaces.

If a check fails, fix the root cause. **Never** bypass with `--no-verify`, `--force`, or new `biome-ignore` suppressions added solely to silence the gate.

## Testing

- Tests live in `tests/` next to the code (`src*/tests/*.test.ts`, or `<workspace>/tests/*.test.ts` in cli/monorepo modes), using `bun:test`.
- Coverage target is **line ≥ 90% and function ≥ 90% in aggregate** (`bunfig.toml`'s `coverageThreshold`). Bun does not yet enforce per-file thresholds; treat per-file as an aspirational target reviewed at PR time.
- Names describe behavior under a condition; assertions tie to the requirement, not the implementation. Inject dependencies (e.g. the RNG in `getRandomId`) to keep tests deterministic.

## Conventions & boundaries

- Conventional Commits required (`feat:`, `fix:`, `docs:`, `chore:`, …). Breaking changes go in a `BREAKING CHANGE:` footer.
- `vendors/` is reference-only — **never modify** files there.
- Never commit secrets, `.env*`, or credentials. Never edit `.github/workflows/` without approval.
- Surgical changes only: touch what the task needs; no drive-by refactors, no speculative abstractions, no comments that restate what the code already says.
- `setup.ts` self-deletes after running; do not re-add `src-app`/`src-lib`/`src-cli`/`src-monorepo` once a mode is chosen.

## Agent Capabilities

- `.claude/skills` and `.claude/commands` are the canonical source for reusable agent skills and slash commands.
- `.agents/skills` is a symlink/adaptor target for other agents and must not become a divergent copy.
- New convergence tooling uses one entrypoint with subcommands (`scripts/ts-base.ts converge ...`), not multiple unrelated scripts.
- Every imported skill, command, config, symlink, or adapter requires explicit confirmation.
- Sensitive or project-specific material is blocked by default.
- Mode-scoped capabilities carry a `supported-modes` frontmatter annotation; `bun run setup` prunes capabilities that do not support the chosen mode and re-wires the `.agents/skills` symlink.

## `ts-base` vs `ts-libs`

- Keep project generation, setup orchestration, scaffold templates, agent skills, slash commands, and project-level conventions in `ts-base`.
- Put reusable runtime libraries, pure utilities, framework-agnostic components, shared validation helpers, reusable CLI primitives, and cross-project TypeScript modules in `~/xprojects/ts-libs`.
- If convergence finds reusable implementation code, classify it as a `ts-libs-candidate`; do not copy it into `ts-base` without a separate confirmed extraction task.
