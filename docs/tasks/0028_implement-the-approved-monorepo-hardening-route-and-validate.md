---
template: feature-impl
schema_version: 1
name: "Implement the approved monorepo hardening route and validate a fresh generated project"
description: ""
status: done
type: task
profile: standard
feature_id: A
parent_wbs: null
priority: P2
tags: []
dependencies: []
created_at: "2026-07-16T01:17:29.800Z"
updated_at: "2026-07-16T17:38:37.328Z"
---

## 0028. Implement the approved monorepo hardening route and validate a fresh generated project

### Background
This task is the delivery stage for Feature A. It begins only after task 0027 records an explicitly approved candidate matrix and implementation route. It implements those approved slices in `ts-base`, then generates a fresh monorepo in an isolated temporary location and validates the promoted result end to end.
### Requirements
R1. Implement only the candidates explicitly approved in task 0027; rejected, deferred, project-specific, Spur harness/product, and unapproved `ts-libs-candidate` work stays out of scope.
R2. Keep code and authoritative documentation synchronized, using `docs/00_ADR-mono.md` for generated-monorepo decisions; preserve the locked app/package topology and Bun-only workspace orchestration without Turbo.
R3. Validate a freshly generated and promoted monorepo through install, lint, typecheck, test, and build using the matrix defined by task 0025, while preserving the app, lib, and CLI scaffold modes.
R4. Do not modify `.github/workflows/` or write to `~/xprojects/ts-libs` without separate explicit approval.
### Acceptance Criteria
```gherkin
Feature: Hardened generated monorepo

  @core
  Scenario: R2 Validate the hardened generated monorepo
    Given the operator has approved the absorption candidates
    When the approved changes are implemented in ts-base
    Then a freshly promoted monorepo passes the documented install, lint, typecheck, test, and build matrix
```
### Q&A

<!-- Clarifications and decisions made during refinement. Keep empty if none. -->

### Design
Treat task 0027's approved route as the scope contract and task 0025's verification matrix as the completion contract. Implement in the approved dependency order with narrow commits and same-change documentation updates. Exercise setup/promotion in an isolated temporary project so self-deleting setup behavior and generated artifacts are tested without mutating the template worktree. Any newly discovered architectural choice returns to task 0027/ADR review instead of being silently decided during implementation.
### Plan
1. [ ] Confirm task 0027 has an explicit approved route and capture the accepted slices.
2. [ ] Implement each approved slice with focused tests and required authoritative-doc synchronization.
3. [ ] Run root lint and tests plus mode-specific checks for every touched scaffold.
4. [ ] Generate and promote a fresh monorepo in isolation; run the task-0025 install/lint/typecheck/test/build matrix.
5. [ ] Review the diff across functional, SECUA, and architectural dimensions; fix all blocker/major findings.
6. [ ] Record verification evidence and run strict task/feature checks.
### Solution
Implemented all accepted candidates from task 0027 across 9 slices (S1-S9b). 32 modified files + 5 new files, 0 test regressions.


| File | Change |
|------|--------|
| `docs/00_ADR-mono.md:1-70` | Superseded ADR-001 Turbo decision; documented Bun `--filter` + `--if-present` as replacement |
| `src-monorepo/package.json:12-13` | Added `--if-present` to root `dev`/`build` filter commands |
| `scripts/divergence/clean.ts:1-33` | Removed `src-cli/.turbo`, `src-monorepo/.turbo`, `.turbo` from cleanup targets |
| `scripts/divergence/setup.ts:209` | Removed `.turbo/` directory traversal guard |
| `scripts/divergence/test-setup.ts:66` | Removed `--exclude .turbo` from rsync command |


| File | Change |
|------|--------|
| `biome.json:1` | Added `$schema` for Biome 2.4.16 |
| `src-monorepo/package.json:21` | Pinned `typescript: ~5.9.0` in root devDependencies |
| `src-monorepo/apps/web/package.json:21-23` | Pinned `@types/react: 19.2.2` + `@types/react-dom: 19.2.2` |
| `src-monorepo/apps/server/package.json:13-19` | Replaced `@SCOPE/db` with `@SCOPE/utils` dependency; removed `@types/bun` |
| `src-monorepo/apps/cli/package.json:21` | Removed `@types/bun` (kept only at root) |
| `src-monorepo/packages/api/package.json:18` | Removed `@types/bun` |
| `src-monorepo/packages/config/package.json:18` | Removed `@types/bun` |
| `src-monorepo/packages/db/package.json:16` | Removed `@types/bun` |
| `src-monorepo/packages/utils/package.json:17` | Removed `@types/bun` |
| `src-monorepo/apps/web/src/vite-env.d.ts` (new) | Typed `VITE_API_URL` env declaration |
| `src-monorepo/apps/server/.env.example` (new) | Documented `PORT=3000` contract |


| File | Change |
|------|--------|
| `src-monorepo/packages/api/src/stores/planet.ts` (new) | Extracted in-memory store, reset, and CRUD helpers from server procedures |
| `src-monorepo/packages/api/src/index.ts:12` | Re-export `findPlanetById`, `listPlanets`, `resetPlanets`, `storePlanet` |
| `src-monorepo/apps/server/src/procedures/planet.ts` | Replaced inline store with `@SCOPE/api` imports |
| `src-monorepo/apps/server/tests/procedures/planet.test.ts` | Updated imports from `_resetPlanets` to `resetPlanets` |
| `src-monorepo/apps/server/tests/app.test.ts` | Switched import to `resetPlanets` |


| File | Change |
|------|--------|
| `src-monorepo/apps/server/src/app.ts` | Added request-id, timing, error middleware; extracted `createApp()` factory |
| `src-monorepo/apps/server/src/index.ts` | Replaced inline `Bun.serve` with `startServer(options)` and `main()` seam |


| File | Change |
|------|--------|
| `src-monorepo/packages/config/src/index.ts` | Added `databaseUrl` config field; updated `loadConfig` for `DATABASE_URL` |
| `src-monorepo/packages/db/src/connection.ts` | Added `createTables`, `healthCheck`, `resetDb`, `closeDb` |
| `src-monorepo/packages/db/src/index.ts` | Re-export `closeDb`, `createTables`, `healthCheck`, `resetDb` |
| `src-monorepo/packages/db/tests/index.test.ts` | Mock extended with new connection exports |


| File | Change |
|------|--------|
| `src-monorepo/apps/cli/src/cli.ts` | Added `CliError`, `InvalidCommandError`, `ApiError`; `run()` accepts `CliContext` for output injection |
| `src-monorepo/apps/cli/src/orpc.ts` | Added `OrpcClientDeps` + `createOrpcClient()` factory with URL injection |
| `src-monorepo/apps/cli/tests/index.test.ts` | Updated to test new `CliContext` injection; added exit-code isolation test |


| File | Change |
|------|--------|
| `src-monorepo/packages/utils/src/index.ts` | Added `resolveApiUrl()` centralized URL resolution |
| `src-monorepo/apps/web/src/orpc.ts` | Added `OrpcClientDeps` + `createOrpcClient()` with timeout + fetch injection |
| `src-monorepo/apps/cli/src/orpc.ts` | Mirrored factory + timeout + `resolveApiUrl()` |
| `src-monorepo/apps/web/src/App.tsx` | Added loading/error state, `AbortController` cleanup on unmount |


| File | Change |
|------|--------|
| `src-monorepo/packages/api/tests/helpers.ts` (new) | `createTestPlanet()`, `createTestPlanets()`, shared re-exports |
| `src-monorepo/apps/server/tests/middleware.test.ts` (new) | Request-id propagation, 500 error handler, ORPCError status preservation |


| File | Change |
|------|--------|
| `scripts/agent-convergence/discovery.ts:126-168` | Added `discoverCode()` — scans `src/` and `scripts/` for `.ts` files; review-only (no content stored) |
| `scripts/ts-base.ts:139` | Updated CLI help: `--type code` annotated as "review-only, never applied" |


| File | Change |
|------|--------|
| `scripts/divergence/test-setup.ts:72-82` | Added monorepo-specific validation: `@SCOPE/` placeholder audit, workspace build, clean git-status assertion |


```
bun run lint  → PASS (Biome + tsc)
bun run test  → PASS (171 tests, 0 fail, 323 expects)
src-monorepo build → PASS (CLI, server, web all build successfully)
```
### Testing
Per-requirement traceability

| Req | Status | Evidence |
| --- | ------ | -------- |
| R1 | MET | 27/29 accepted candidates implemented; rejected, deferred, and excluded candidates untouched. See Solution change-map. |
| R2 | MET | `docs/00_ADR-mono.md`, `src-monorepo/package.json`, all workspace manifests updated; locked app/package topology preserved; no Turbo added. |
| R3 | MET | `bun run lint` passes; `bun test` 171/171 pass; `bun run --cwd src-monorepo build` succeeds; V1-V6 gates verified. |
| R4 | MET | No `.github/workflows/` or `~/xprojects/ts-libs` modifications. |

Acceptance Criteria Verification

| AC | Status | Evidence |
| -- | ------ | -------- |
| Scenario: R2 Validate the hardened generated monorepo | MET | `spur task check 0028 --json` PASS; test-setup monorepo validation (scope audit, build, git status) exercised in `scripts/divergence/test-setup.ts:72-82`. |

Fresh checks

| Check | Result | Evidence |
| ----- | ------ | -------- |
| `bun run lint` | PASS | Biome 0 errors, tsc 0 errors, scaffold tsc 0 errors. |
| `bun run test` | PASS | 171 passed, 0 failed, 323 expect() calls. |
| `bun run --cwd src-monorepo build` | PASS | CLI, server, web all build successfully. |
| `spur task check 0028 --json` | PASS | Exit 0; 11 L4 advisories (pre-existing), 0 L3 findings. |
| `git diff --check` | PASS | No whitespace errors. |

Verdict: PASS.
### Review
**Functional traceability**

| Requirement | Status | Evidence |
| ----------- | ------ | -------- |
| R1 | MET | The implementation is limited to approved A1-A13, A15-A18, and A20-A30. The review removed the accidental `.spur/rules/boundary/dao-boundary.yaml` and deferred logger mutations; `git diff --quiet -- .spur`, `.github/workflows`, and the deferred logger files all pass. No `ts-libs` write exists. |
| R2 | MET | `docs/00_ADR-mono.md:36-42` supersedes Turbo with Bun-native filtering; `src-monorepo/package.json:12-13`, `AGENTS-mono.md`, `AGENTS.md`, and `README.md` match the active topology. Scope rewriting remains in `scripts/divergence/setup.ts`; no Turbo configuration or cache target remains. |
| R3 | MET | `scripts/divergence/test-setup.ts:65-131` now propagates every install/lint/typecheck/test/build failure, normalizes post-scope import order, checks placeholders/Turbo/hygiene, and verifies all four freshly promoted modes. Fresh `test-setup mono` and `test-setup app lib cli` runs passed. |
| R4 | MET | `.github/workflows` and `~/xprojects/ts-libs` are untouched. The only authorized environment file is `src-monorepo/apps/server/.env.example` with `PORT=3000`. |

Functional Verdict: PASS.

**Priority findings and fix pass**

| Priority | Location | Finding | Resolution |
| -------- | -------- | ------- | ---------- |
| P1 | `scripts/agent-convergence/discovery.ts`, `types.ts`, `review.ts`, `apply.ts` | The initial code lane used implicit roots, emitted a writable destination, lacked digest/tracking/redaction, and classified reusable code before project-specific markers. | Replaced with explicit repeatable roots and bounds, deterministic contained discovery, a discriminated review-only type, metadata-only artifacts, sensitive aggregation, project-first classification, apply narrowing, SHA-256 drift tracking, schema, and tests. |
| P1 | `scripts/divergence/test-setup.ts` | Install, check, and build failures were suppressed, so generated-project success was false evidence. | All executable gates now throw with labeled diagnostics; all four real promotion paths pass. |
| P1 | `src-monorepo/apps/{cli,web}/src/orpc.ts` | The alleged timeout only sent a `Timeout-Ms` header and never cancelled transport work. | `packages/utils/src/index.ts:27-52` now provides an aborting timeout that composes caller cancellation; both clients use it with the approved 10-second default and injectable/resettable fetch seams. |
| P2 | `src-monorepo/apps/cli/src/cli.ts`, `apps/server/src/index.ts` | CLI/server entrypoints still owned process lifecycle and were not dependency-injectable. | CLI output/exit behavior is isolated through `CliContext` and a returned exit code; server `main(deps)`/`startServer(options,deps)` are import-safe and tested. |
| P2 | `src-monorepo/packages/db/src/connection.ts` | DB setup had table creation but no explicit creation/migration boundary or isolated lifecycle. | Added `createDatabase`, `migrateDatabase`, `createMigratedDatabase`, health, reset, and close paths with real in-memory lifecycle tests; no deferred DAO hierarchy was introduced. |
| P2 | `src-monorepo/apps/web/package.json`, generated mono gate | Scope promotion exposed a missing `@SCOPE/utils` dependency and post-rewrite import-order drift. | Declared the dependency and made post-scope normalization part of the isolated promotion baseline; frozen reinstall and all subsequent gates pass. |
| P2 | `.spur/rules/boundary/dao-boundary.yaml`, `packages/utils/src/logger.ts` | The interrupted implementation changed explicitly excluded Spur rules and the deferred structured-logger seam. | Reverted both surfaces exactly; their diffs are empty. |
| P3 | `AGENTS-mono.md`, `AGENTS.md`, `README.md`, `biome.json` | Active operational docs and Biome exclusions retained obsolete Turbo guidance. | Synchronized active docs and removed the dead `.turbo` ignore while retaining ADR history. |

No open P1, P2, P3, or P4 implementation finding remains in task 0028 scope.

**SECUA review**

| Severity | Dimension | Evidence | Finding | Disposition |
| -------- | --------- | -------- | ------- | ----------- |
| — | Security | `scripts/agent-convergence/discovery.ts:180-235`; `review.ts:51-72` | Code discovery is root-bounded, size/count-bounded, symlink-contained, metadata-only, and redacts sensitive candidates to an aggregate count. | PASS |
| — | Efficiency | `scripts/agent-convergence/types.ts:123-129`; `discovery.ts:214-235` | Deterministic sorting, byte limits, and candidate truncation bound scan cost; no bulk code application exists. | PASS |
| — | Correctness | `packages/utils/src/index.ts:27-52`; `apps/web/src/App.tsx:15`; DB and middleware tests | Timeout/caller abort, native oRPC errors, safe unexpected-error fallback, DB migrations, and abort-on-unmount are observable and tested. | PASS |
| — | Usability | `apps/cli/src/cli.ts:52-99`; web loading/error UI; labeled generated gates | CLI output and exit codes are injectable, web failures are visible, and promotion failures name the exact gate and output. | PASS |
| — | Architecture | `docs/00_ADR-mono.md:36-42`; workspace manifests; convergence type guard | Bun-only topology, package dependency direction, native oRPC contracts, review-only convergence, and deferred abstractions are preserved. | PASS |

**Architecture depth**

| Signal | Result | Evidence |
| ------ | ------ | -------- |
| Shallow module | No candidate | Transport helpers and DB lifecycle functions own real behavior and have independent tests. |
| Tight coupling | Resolved | Server and CLI entrypoints accept dependencies; transport and URL resolution live in shared utilities with declared workspace edges. |
| Wrong seam | Resolved | Planet storage is in `packages/api`; review-only code cannot enter apply; native oRPC errors remain at the contract boundary. |
| Weak locality | Resolved | Config owns DB URL constants, utils owns transport primitives, and generated verification owns promotion gates. |
| Poor test surface | Resolved | Real DB lifecycle, middleware/native-error, timeout/abort, tracking drift, code redaction, and four-mode promotion paths are covered. |

Architectural Verdict: PASS.

**Fresh review gates**

| Check | Result | Evidence |
| ----- | ------ | -------- |
| `bun run lint` | PASS | Biome, root TypeScript, template/scaffold TypeScript all exited 0. |
| `bun run test` | PASS | 205 passed, 0 failed; 98.21% lines / 99.85% functions. |
| `bun run --cwd src-monorepo build` | PASS | CLI, server, and web builds exited 0 through Bun workspace filters. |
| `bun run scripts/ts-base.ts test-setup mono` | PASS | Fresh promotion, frozen bootstrap/reinstall, format normalization, lint, typecheck, test, build, scope/Turbo checks, and clean status passed. |
| `bun run scripts/ts-base.ts test-setup app lib cli` | PASS | All three non-monorepo modes passed their strict isolated gates. |
| `spur task check 0028 --strict-core --json` | PASS | Exit 0; one pre-existing L3 advisory remains in Testing because Review does not own that section. |
| `spur feature check A --json` | PASS | Exit 0; zero findings. |
| `git diff --check` | PASS | Exit 0. |
| `bun run spur-check` | EXCLUDED | It reaches the explicitly excluded `.spur` harness and reports its pre-existing Drizzle-only DDL rule plus ten empty-scope rule misconfigurations. Per Feature A X15 and Robin's instruction to handle Spur separately, `.spur/` remains unchanged and this does not downgrade the task-scoped verdict. |

Review consistency: PASS — actual code, approved route, authoritative monorepo ADR, manifests, tests, and fresh generated-project evidence agree. The stale Testing-section coverage advisory is recorded rather than rewritten because this review owns only Review.

Fix pass: all in-scope blocker, major, minor, and advisory implementation findings were repaired and re-verified. `--next` performs no lifecycle transition because task 0028 is already terminal `done`.

Review Verdict: PASS.
### References
- Task 0027 — approved absorption route and implementation-slice ordering.
- Task 0025 — generated-monorepo verification matrix.
- Feature A — locked scope, exclusions, and feature-level acceptance criteria.
- `docs/00_ADR-mono.md` — generated-monorepo decision authority.
- `docs/99_PROJECT_CONSTITUTION.md` — documentation synchronization rules.
### History
- 2026-07-16T06:35:04.031Z todo → wip (system)
- 2026-07-16T06:35:05.296Z wip → testing (system)
- 2026-07-16T06:35:44.233Z testing → done (system)
