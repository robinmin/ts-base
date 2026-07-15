---
template: review
schema_version: 1
name: "Audit the ts-base monorepo scaffold against its mode contract and generated behavior"
description: ""
status: Done
type: review
profile: standard
feature_id: A
parent_wbs: null
priority: P0
tags: ["wayfinder:research", "monorepo", "review", "target-audit"]
dependencies: []
created_at: "2026-07-15T22:32:15.118Z"
updated_at: 2026-07-15T23:06:30.949Z
---

## 0020. Audit the ts-base monorepo scaffold against its mode contract and generated behavior

### Background

Wayfinder type: research. Sharp question: Which correctness, architecture, security, maintainability, test, documentation, and setup defects currently prevent `AGENTS-mono.md` plus `src-monorepo/` from being a solid generated-project baseline?

#### Review Findings

The code-review findings this task must address — logged here as **input** (what was found
in the reviewed PR/commit/diff). Fix in priority order (P1 → P2 → …); re-review after.

Verified by 5 parallel scout audits + direct grep/read confirmation on 2026-07-15.

| Severity | File | Finding | Recommendation |
| -------- | ---- | ------- | -------------- |
| P1 | `src-monorepo/package.json:12-13` | **Root `dev`/`build` scripts filter `./packages/*` but all 4 packages (api, config, db, utils) have no `dev` or `build` script.** Running `bun run dev` or `bun run build` in the generated monorepo errors with "Script not found" for every package. The generated project's documented commands are broken on first run. | Drop `--filter './packages/*'` from `dev`/`build` (packages only need `test`/`typecheck`), OR add `dev`/`build` scripts to all 4 packages. |
| P1 | `src-monorepo/apps/server/package.json` | **`@SCOPE/utils` imported but not declared in `dependencies`.** `src/app.ts:1` and `src/index.ts:2` both `import { logger } from '@SCOPE/utils'`, but `dependencies` lists only `@SCOPE/api`, `@SCOPE/config`, `@SCOPE/db`. Resolves via Bun hoisting but breaks under `bun install --production` or strict resolvers. | Add `"@SCOPE/utils": "workspace:*"` to `apps/server/package.json` dependencies. |
| P1 | `src-monorepo/package.json` (root) + AGENTS-mono.md:46-52,84-89 | **ADR-001 declares Turborepo orchestration (`turbo.json` with `dependsOn: ["^…"]`) but no `turbo.json` exists anywhere.** Root scripts use bare `bun run --filter` (no task graph, no caching, no topological ordering). AGENTS-mono.md documents `turbo run` commands that won't work. Authority drift — declared orchestrator is absent. | Either add `turbo.json` + `turbo` devDep to honor ADR-001, OR add a superseding ADR recording the decision to use Bun-workspaces only (no Turbo). Per ADR process, silent divergence is prohibited. |
| P1 | `src-monorepo/apps/web/package.json:21-22` | **`@types/react: "latest"` and `@types/react-dom: "latest"` — un-pinned floating ranges.** Every other dependency uses caret or exact pins. Non-reproducible: different `bun install` times resolve different type definitions, causing type-check drift. | Pin to `^19.x` matching `react: ^19.2.0`, or to an exact version. |
| P2 | `docs/00_ADR-mono.md:70` (ADR-005) vs `src-monorepo/apps/server/src/procedures/planet.ts:16` | **ADR-005 mandates the in-memory planet store lives in `packages/api` ("in-memory array (`packages/api` planet store)") but `_resetPlanets()` and the store actually live in `apps/server/src/procedures/planet.ts`.** Authority says `packages/api`, implementation says `apps/server`. Contract drift. | Either move the store + `_resetPlanets()` into `packages/api` to match ADR-005, OR update ADR-005 to record the actual location (`apps/server`) via a superseding entry. |
| P2 | `src-monorepo/packages/config/src/index.ts:1` + `packages/config/package.json:13` | **`packages/config` imports `zod` directly, bypassing `@SCOPE/utils` re-export.** ADR-002: "zod flows through `packages/utils` so contracts and validation share one copy." `packages/utils/src/index.ts` explicitly re-exports `z` with a comment "Re-export zod so every workspace package gets it through utils." `packages/api` correctly imports from `@SCOPE/utils`; `packages/config` does not. | Change `packages/config/src/index.ts` to `import { z } from '@SCOPE/utils'` and replace `zod` dep with `@SCOPE/utils: workspace:*`. |
| P2 | `src-monorepo/apps/server/package.json` | **`@SCOPE/db` declared in `dependencies` but never imported anywhere in `apps/server/src/**`.** ADR-005 says `packages/db` is "ready to back the procedures" — declaring the dep without a single import or documented swap site implies the integration is done when it isn't. | Either drop the unused dependency, OR add a documented seam (e.g. a commented `// import { db } from '@SCOPE/db'` near the in-memory store in `procedures/planet.ts:5`) so the production swap is discoverable. |
| P2 | `src-monorepo/apps/server/` (missing `.env.example`) | **ADR-004: "Config per app lives in its `.env.example`."** `apps/web/.env.example` and `apps/cli/.env.example` exist; `apps/server/` has none. The server reads `PORT` via `packages/config` and needs a documented default. Missing contract surface. | Add `apps/server/.env.example` with `PORT=3000` (matching ADR-004's default dev port). |
| P2 | `src-monorepo/apps/web/src/` (missing `vite-env.d.ts`) | **`VITE_API_URL` env var is untyped.** No `vite-env.d.ts` / `ImportMetaEnv` augmentation exists. `VITE_API_URL` resolves to `any` via `vite/client` index signature — no compile-time guard against typos. | Add `apps/web/src/vite-env.d.ts` with `/// <reference types="vite/client" />` and an `ImportMetaEnv` interface declaring `VITE_API_URL: string`. |
| P2 | `src-monorepo/` (all 8 package.json files) | **`@types/bun: "1.3.14"` declared as devDep in all 8 package.json files** (root + 7 workspaces). In a workspace setup, the root devDep already makes types available via hoisting. The 7 redundant declarations add maintenance overhead — every version bump requires editing 8 files. | Keep `@types/bun` in root `package.json` devDeps only; remove from the 7 workspace package.json files. |
| P3 | `src-monorepo/scripts/divergence/clean.ts:9` | **Dead reference: `src-monorepo/.turbo` listed as a clean target but no `.turbo` directory is ever created** (no `turbo.json` → no turbo cache). Minor, but signals the stale Turbo contract. | Remove `.turbo` from clean targets if Turbo is dropped (see P1 Turbo finding). |
| P3 | `src-monorepo/apps/web/tests/orpc.test.ts` | **Tests assert procedure presence (`toBeDefined`) but never exercise the env-read/fallback behavior** — the defining contract of the oRPC client twin. `App.tsx` is untested entirely. Violates R8 (tests verify intent). | Add tests that verify `VITE_API_URL` is read and the fallback URL is used when unset. |
| P3 | `src-monorepo/apps/web/src/App.tsx` | **No test coverage for `App.tsx`** — the main component that fetches and renders the planet list. Coverage gap. | Add a component test that mocks the oRPC client and asserts the planet list renders. |
| P3 | `src-monorepo/packages/api/tests/contracts/planet.test.ts` | **Trivial `toBeDefined()` assertions on `PlanetSchema` and `planetContract` — does not exercise schema or contract shape.** Redundant with `index.test.ts` which already has `safeParse` assertions. Adds no coverage. | Either remove (redundant) or add shape-asserting tests (e.g. `oc.input`/`oc.output` schema checks). |
| P3 | root `bunfig.toml` (comment) | **Comment says "Template ships with no enforced threshold" but `coverageThreshold = { lines = 0.9, functions = 0.9 }` IS 90/90.** Misleading comment contradicts the value. | Fix the comment to say "Enforced at 90/90 lines/functions" or set the threshold to 0 if truly unenforced. |
| P4 | `.lefthook.yml:4,16` + no `cog.toml` anywhere | **`.lefthook.yml` references `cog verify` and `cog check` but no `cog.toml` exists.** Cocogitto uses built-in defaults — no commit types, scopes, or changelog config. Unconfigured tool surface; may work but contract is implicit. | Either add a `cog.toml` with allowed commit types and scopes, OR document that cocogitto defaults are the intended contract. |


### Requirements
R1. Inspect `docs/00_ADR-mono.md`, `AGENTS-mono.md`, `src-monorepo/`, setup promotion, shared configuration, and relevant tests.
R2. Report findings by severity with precise file references and observable impact.
R3. Identify authority drift, including the superseded Turborepo contract, without editing files.
R4. Separate monorepo-only defects from shared `ts-base` convergence or setup defects.
### Acceptance Criteria

<!-- Checks that prove the findings were addressed. Keep empty until the review task becomes executable work. -->

### Q&A

<!-- Clarifications, false positives, accepted risk, and triage decisions. -->

### Design

<!-- Fix approach and tradeoffs if the findings require design judgment. -->

### Plan

- [ ] Fix P1 findings
- [ ] Fix P2 findings
- [ ] Fix all the remaining findings if any
- [ ] Re-review the changed code

### Solution

Audit completed 2026-07-15. 16 findings logged in Review Findings table (4 P1, 6 P2, 4 P3, 1 P4). Key results:

**P1 (4):**
1. Root `dev`/`build` filter `./packages/*` — no package has those scripts → broken on first run
2. `@SCOPE/utils` imported but not declared in `apps/server/package.json` deps
3. ADR-001 declares Turborepo but no `turbo.json` exists — authority drift
4. `@types/react: "latest"` in `apps/web/package.json` — non-reproducible

**P2 (6):**
5. ADR-005 says planet store in `packages/api` but it's in `apps/server`
6. `packages/config` imports `zod` directly, bypassing `@SCOPE/utils` (ADR-002 violation)
7. `@SCOPE/db` declared in server deps but never imported
8. `apps/server/` missing `.env.example` (ADR-004 contract)
9. `apps/web/src/` missing `vite-env.d.ts` — `VITE_API_URL` untyped
10. `@types/bun` redundantly declared in all 8 package.json files

**P3 (4):** Dead `.turbo` ref in clean.ts, test intent gaps in web/api, misleading bunfig.toml comment.

**P4 (1):** No `cog.toml` despite `.lefthook.yml` referencing cog.

This is a review/wayfinder task — no code was modified. Findings are input for follow-up fix tasks.


### Testing

<!-- Filled during verification: commands/checks run, outcomes, coverage claim or N/A. -->

### Review

Post-implementation reflection — filled **after** the first fix round: what went wrong, what
remains to fix before closing, and any **back-issues** (new findings surfaced by the fix).

| Severity | File | Finding | Recommendation |
| -------- | ---- | ------- | -------------- |
| P1       |      |         |                |
| P2       |      |         |                |

### References

- `docs/00_ADR-mono.md` — ADR-001 through ADR-005 (binding architecture decisions)
- `AGENTS-mono.md` — monorepo agent instructions (commands, conventions, verification gate)
- `src-monorepo/` — scaffold source (apps/{server,web,cli}, packages/{api,config,db,utils}, tooling/typescript/)
- `scripts/divergence/setup.ts` — `setupWorkspace()` (line 269-297), `applyScope()` (line 204-220)
- `scripts/_modes.ts` — shared/app/lib script blocks (no MONO_SCRIPTS export)
- 5 parallel scout audits: AuditServerApp, AuditWebApp, AuditCliApp, AuditPackages, AuditToolingAndRoot


### History
- 2026-07-15T22:54:24.353Z todo → wip (system)
