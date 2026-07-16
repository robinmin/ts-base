# AGENTS.md

Guidance for AI coding agents working in this repository. `CLAUDE.md` and `GEMINI.md` symlink here.

## Project

`ts-base` is a Bun + TypeScript + Biome project-template and agent-tooling workbench. It has two explicit flows:

- **Divergence:** generate a new project from curated app, lib, cli, or monorepo scaffolds.
- **Convergence:** absorb reusable agent capabilities, commands, workflow conventions, and quality practices from selected source projects after review.

The repository still ships **four modes** side by side; `bun run setup` keeps one and removes the rest:

- **Application** (`src-app/`) — a `Bun.serve` HTTP server. Flat single-package layout → `src/`.
- **Library** (`src-lib/`) — a publishable package (`internal.ts` runtime-agnostic core, `index.ts` Node entry, `browser.ts` browser entry), built with `tsc` plus the Bun dist ESM extension fixer. Flat single-package layout → `src/`.
- **CLI** (`src-cli/`) — a Bun-workspaces layout with a Commander-based CLI in `apps/cli` and shared `packages/{config,utils}`. Promoted to the repo root on setup.
- **Monorepo** (`src-monorepo/`) — a Bun-workspaces layout promoted to the repo root: `apps/{server,web,cli}` and `packages/{api,config,db,utils}`. Workspaces reference each other by the project scope (`@<scope>/*`), derived from the root `package.json` name; the `@SCOPE/` placeholder in every `package.json` and `.ts`/`.tsx` source file is rewritten in place.

After setup the chosen layout is promoted, the other scaffolds are deleted, and mode-specific scripts/deps/CI are wired into `package.json` and `.github/workflows/`. Once setup has run, treat the repo as a normal single-mode project.

Convergence work must be review-first. Imported skills, commands, configs, or enhancements are proposed as classified candidates and applied only after explicit confirmation.

## Documentation map

Each doc owns exactly **one question** about the system and is the single source of truth for it.
A fact lives in **one** doc; other docs link to it, never restate it. Read the doc that governs
your change before editing code; edit the **authoritative** doc for the topic, never patch a
symptom in a derived one.

**Conflict rule:** lower number wins. `00_ADR` is binding and overrides all others on *decisions*;
`01_PRD` is authoritative on *scope*. On conflict, fix the authoritative doc and flag the drift.
`docs/99_PROJECT_CONSTITUTION.md` is authoritative on *process* — how these files are
maintained (edit rules, sync triggers, drift audits, writing rules). It holds no project content,
so the two axes never collide. Read it before editing any doc below. Each numbered doc carries
its contract as YAML frontmatter (constitution §4.3).

| Doc | Owns the question | Authority | Read / edit when |
|-----|-------------------|-----------|------------------|
| `docs/00_ADR.md` | **WHY** — which cross-cutting decision was made, and the one-line reason | **Authoritative** (wins all) | Read before any structural change; add a dated entry before diverging from a decision |
| `docs/01_PRD.md` | **WHAT** — product vision, users, scope (in / out / deferred) | **Authoritative on scope** | Read before adding a command/feature; edit when scope changes |
| `docs/02_ROADMAP.md` | **WHEN** — phases, current vs deferred, sequencing | Derived | Read to place work in a phase; edit when phase status changes |
| `docs/03_ARCHITECTURE.md` | **HOW** — module boundaries, data flow, runtime model, invariants, the *rationale* behind a decision | Derived (ADR wins) | Read before cross-module/seam/schema work; edit when boundaries or mechanisms change |
| `docs/04_DESIGN.md` | **SURFACE** — concrete shapes: every CLI command, flag, config key, env var, table, DTO | Derived | Read/edit when changing a command, flag, env var, or schema |
| `docs/05_FEATURES.md` | **STATUS** — feature decomposition + state (✅ done / 🔶 partial / ⏳ planned / 💤 deferred) | Derived | Read to find a feature's state; edit when a feature's status changes |
| `docs/99_PROJECT_CONSTITUTION.md` | **PROCESS** — how the files above are maintained: edit rules, same-commit sync triggers, drift audits, lessons | **Authoritative on process** | Read before editing any doc above; lessons machine-appendable per its §8 |
| `AGENTS.md` (this file) | **ENTRY** — stack, commands, gates, conventions + this doc map | Derived (from 99 + 00/01/04) | Read first every session; factual blocks regenerated from code, never from memory |

**Routing — put each fact in its owning doc, link from the rest:**

- Decision + one-line reason → `00`. Rationale/consequences in depth → `03`.
- Scope (in/out/deferred) → `01`. Mechanism / data flow / invariants → `03`.
- Command/flag/config/schema/DTO shapes → `04`. Phase timing → `02`. Feature status → `05`.
- If you're writing *how it's built* or *why* inside `00`/`01`/`02`, it belongs in `03`/`04`.

A code change that contradicts `00_ADR.md` requires adding a new dated ADR entry that supersedes the
old one **first** — never silently diverge. Any new cross-cutting choice (new app/package, transport
swap, auth boundary, DB swap) gets a new ADR entry pointing to its `03`/`04` detail. A change that
touches a command/config/schema keeps `04_DESIGN.md` in sync in the **same commit**.

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

Mode-specific: app has `start`/`dev`; lib has `build` (`tsc` + Bun dist extension fixer) and `smoke:dist`; cli and monorepo proxy `dev`/`build`/`test`/`typecheck` through dependency-aware Bun `--filter` commands across all workspaces.

## Verification gate (all must pass before "done")

1. `bun run lint` clean — Biome **and** `tsc --noEmit`.
2. `bun run test` passes; no test skipped, `.skip`'d, or commented out to go green.
3. For changes touching architecture, template policy, or convergence rules, run `bun run spur-check` when Spur is available.
4. `git status` shows only intentional changes.
5. Lib mode only: `bun run build` and `bun run smoke:dist` succeed.
6. CLI / Monorepo mode only: `bun run build` succeeds through Bun workspace filters.

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
