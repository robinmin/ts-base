---
template: review
schema_version: 1
name: "Define the generated-monorepo verification matrix for absorbed changes"
description: ""
status: done
type: review
profile: standard
feature_id: A
parent_wbs: null
priority: P0
tags: ["wayfinder:research", "verification", "setup", "monorepo"]
dependencies: []
created_at: "2026-07-15T22:32:15.125Z"
updated_at: "2026-07-16T00:30:08.487Z"
---

## 0025. Define the generated-monorepo verification matrix for absorbed changes

### Background
Wayfinder type: research. Sharp question: What reproducible test matrix proves the promoted monorepo is installable, correctly scoped, architecturally consistent, and green after each approved absorption slice?

#### Review Findings

The code-review findings this task must address — logged here as **input** (what was found
in the reviewed PR/commit/diff). Fix in priority order (P1 → P2 → …); re-review after.

| Severity | File | Finding | Recommendation |
| -------- | ---- | ------- | -------------- |
| P1 | `scripts/divergence/test-setup.ts:73-75` | **`createRealRunner` suppresses install and check failures via `.nothrow()`** — no real installability proof. The smoke test reports success even when the promoted project is broken (install fails, lint fails, tests fail). | Remove `.nothrow()` on `bun install` and `bun run check`; add explicit `expect` assertions on exit codes. |
| P1 | `scripts/tests/divergence/test-setup.test.ts:109-160` | **No mono-mode integration test exists.** `createRealRunner` is only exercised with `'app'` mode. `setupWorkspace()` (the mono promotion path, `setup.ts:269-297`) is never tested end-to-end. The 4 P1 defects from task 0020 (broken `dev`/`build`, missing `@SCOPE/utils` dep, Turbo drift, un-pinned `@types/react`) would not be caught. | Add a mono-mode test case: rsync → `runSetupDirect('mono', ...)` → `bun install` → `bun run check` → `bun run build` → assert zero `@SCOPE/` remaining → assert `git status` clean. |
| P1 | `scripts/divergence/setup.ts:269-297` (setupWorkspace) | **No post-promotion verification.** `setupWorkspace()` moves files, replaces root `package.json`, removes scaffolds, but never runs `bun install`, `bun run lint`, `bun run typecheck`, `bun run test`, or `bun run build`. All verification is delegated to the caller. | Either embed a post-promotion verification step in `runSetup` (preferred for `--check` mode), or document that `test:setup` is the mandatory verification gate and make it non-suppressing. |
| P2 | `scripts/divergence/setup.ts:204-220` (applyScope) | **No placeholder rewrite completeness check.** `applyScope()` scans `apps/**/*`, `packages/**/*`, `tooling/**/*`, `*.{json,md,ts,tsx,html}` but never asserts zero remaining `@SCOPE/` tokens. A file outside the 4 glob patterns retains the placeholder silently. | Add a post-rewrite assertion: `grep -r '@SCOPE/' <promotedRoot>` must return zero hits. |
| P2 | `scripts/divergence/setup.ts` (missing) | **No workspace dep-completeness assertion.** No test checks that every `import { ... } from '@<scope>/*'` has a matching `workspace:*` declaration in the importing package's `dependencies`. The `@SCOPE/utils` missing-dep P1 from task 0020 proves this gap. | Add a static analysis check: parse all `import` statements, cross-reference `@<scope>/*` imports against `dependencies` in each workspace `package.json`. |
| P2 | `scripts/divergence/setup.ts` (missing) | **No package-boundary assertion.** No test enforces dependency direction (apps → packages, never packages → apps, never apps → sibling apps). The `@SCOPE/db` unused dep and `packages/config` direct-zod import (ADR-002 violation) from task 0020 prove this gap. | Add a boundary check: assert no `packages/*` imports from `apps/*`; assert no `apps/*` imports from sibling `apps/*`. |
| P2 | `scripts/divergence/test-setup.test.ts` (missing) | **No git-status hygiene assertion.** Setup removes many files/dirs but no test asserts the working tree is clean after promotion (no leftover scaffold files, no dangling symlinks). `repairAgentSymlinks()` runs but is not verified. | Add `git status --porcelain` assertion after promotion: must be empty or contain only expected new files. |
| P3 | `scripts/divergence/setup.ts` (missing) | **No workspace script-consistency assertion.** Setup copies the monorepo `package.json` verbatim; it does not validate that root `--filter` targets have matching scripts in all workspaces. The broken `dev`/`build` filter (P1 from task 0020) proves this gap. | Add a check: for each root script using `--filter`, verify the target script exists in at least one workspace `package.json`. |
| P3 | `scripts/tests/divergence/clean.test.ts` | **Clean test does not cover scaffold-dir cleanup.** Tests `dist` removal and empty-state reporting but does not test `.turbo`, `node_modules` in scaffolds, or `src-monorepo/bun.lock` targets. | Add test cases for each target in `clean.ts` TARGETS array. |
| P3 | `scripts/tests/divergence/scaffold-install.test.ts` | **No `bun install` behavior test.** Tests symlink creation but not whether `bun install` succeeds in the scaffold or whether `workspace:*` resolves correctly. | Add an integration test that runs `bun install` in the scaffold and verifies `@SCOPE/*` resolves. |
| P4 | `scripts/divergence/test-setup.ts:51-78` (createRealRunner) | **`.prototools` is copied but not verified.** The runner copies `.prototools` for lefthook's `prepare` hook, but does not assert `proto use` succeeds or that the toolchain is available. | Add a pre-install assertion that `bun --version` matches the pinned version. |
### Requirements
R1. Cover setup promotion, placeholder rewriting, install, lint, typecheck, tests, build, and git-status hygiene.
R2. Include regression checks for Bun workspace orchestration and package-boundary correctness.
R3. Distinguish fast per-slice gates from full generated-project smoke tests.
R4. Identify current test harness gaps and the minimum evidence required before completion claims.
### Acceptance Criteria
**Acceptance Criteria**

- [ ] AC1: The verification matrix covers all 7 post-promotion gates (install, lint, typecheck, test, build, git-status hygiene, placeholder completeness) — see R1 table in Solution.
- [ ] AC2: The matrix includes regression checks for workspace dep-completeness, package-boundary direction, and script-consistency — see R2 table in Solution.
- [ ] AC3: The matrix distinguishes fast per-slice gates (static analysis, no install) from full smoke tests (install + build pipeline) — see R3 table in Solution.
- [ ] AC4: The matrix identifies all 6 current test harness gaps with minimum evidence required for each — see R4 table in Solution.
- [ ] AC5: Each finding cites `file:line` evidence and maps to a specific gate in the matrix.
### Q&A
**Q&A**

- **Q: Should the verification matrix be implemented as automated tests or documented as a checklist?**
  A: Both. The fast gates (placeholder completeness, dep-completeness, package-boundary, script-consistency) are static-analysis checks that can be automated as unit tests. The full smoke test (install → lint → typecheck → test → build → git-status) is an integration test. The matrix document itself serves as the checklist for manual review during absorption.

- **Q: Should `createRealRunner` remove `.nothrow()` entirely?**
  A: Yes. `.nothrow()` on `bun install` and `bun run check` makes the runner report success even when the promoted project is broken. The fix is to remove `.nothrow()` and add explicit `expect(exitCode).toBe(0)` assertions. This is a P1 finding because it means the current test harness provides false confidence.

- **Q: Why is the mono-mode integration test more important than the app-mode test?**
  A: The mono promotion path (`setupWorkspace()`) is more complex than the flat promotion path (`setupFlat()`). It moves files, replaces the root `package.json`, removes scaffolds, and rewrites `@SCOPE/` placeholders across multiple workspace packages. The 4 P1 defects from task 0020 (broken `dev`/`build`, missing `@SCOPE/utils` dep, Turbo drift, un-pinned `@types/react`) all exist in the mono scaffold and would not be caught by the current app-mode-only test.

- **Q: Is the `@SCOPE/` placeholder a defect?**
  A: No. `applyScope()` rewrites `@SCOPE/` → `@${scope}/` at setup time (`setup.ts:204-220`). The defect is the absence of a post-rewrite completeness assertion — a file outside the 4 glob patterns (`apps/**/*`, `packages/**/*`, `tooling/**/*`, `*.{json,md,ts,tsx,html}`) retains the placeholder silently. The fix is a post-rewrite `grep` assertion.

- **Q: How does ADR-006 (Bun-native `--filter`) affect this matrix?**
  A: ADR-006 will supersede ADR-001, replacing Turbo with `bun run --filter '*' <script>`. The verification matrix is agnostic to the build orchestrator — the same gates (install, lint, typecheck, test, build) apply regardless. The script-consistency check (P3-1) becomes: for each root `--filter` script, verify the target script exists in at least one workspace `package.json`.
### Design
**Design**

**Approach**: Review-only task — produces a verification matrix document, not code. The matrix maps each requirement (R1-R4) to specific checks, gates, and evidence, synthesized from the 11 findings.

**Tradeoffs**:

1. **Fast gates vs full smoke**: The matrix distinguishes static-analysis checks (fast, no install needed) from the full install→build pipeline (slow, but proves real installability). This allows rapid iteration during absorption slices while preserving a release gate. The tradeoff: fast gates cannot catch runtime errors (e.g., a `workspace:*` dep that resolves to a broken package); only the full smoke test can.

2. **Embed verification in `runSetup` vs delegate to `test:setup`**: Two options for post-promotion verification. (a) Embed `bun install` + `bun run check` in `runSetup` for `--check` mode — immediate feedback, but couples setup to verification. (b) Document `test:setup` as the mandatory gate — separation of concerns, but requires discipline to always run it. Recommendation: (b) with a non-suppressing `test:setup` as the gate, because setup.ts should remain a pure file-transformation tool.

3. **`.nothrow()` removal**: Removing `.nothrow()` from `createRealRunner` will cause the existing app-mode test to fail if the promoted app is broken. This is the intended behavior — the test should fail. The tradeoff: any pre-existing breakage in the app scaffold will surface as a test failure, which is correct but may require fixing the app scaffold first.

**Non-goals** (out of scope for this review task):
- Implementing the verification matrix as automated tests (that is implementation work for a future `code` task).
- Implementing ADR-006 supersession of ADR-001 (tracked in task 0023's doc-update list).
- Fixing the 4 P1 defects from task 0020 (broken `dev`/`build`, missing `@SCOPE/utils` dep, Turbo drift, un-pinned `@types/react`) — those are implementation tasks.
### Plan

- [ ] Fix P1 findings
- [ ] Fix P2 findings
- [ ] Fix all the remaining findings if any
- [ ] Re-review the changed code

### Solution
The verification matrix below maps each requirement (R1-R4) to the specific checks, gates, and evidence required. It synthesizes the 11 findings into a coherent test strategy distinguishing fast per-slice gates from full smoke tests.

## Verification Matrix

**R1: Post-promotion verification (install, lint, typecheck, test, build, git-status hygiene)**

| Gate | Command | Scope | Findings Addressed |
| --- | --- | --- | --- |
| Install | `bun install --frozen-lockfile` | Full | P1-1 (`.nothrow()`), P1-3 (no post-promotion verify) |
| Lint | `bun run lint` (biome check + tsc --noEmit) | Full | P1-1, P1-3 |
| Typecheck | `bun run typecheck` (tsc --noEmit) | Full | P1-3 |
| Test | `bun run test` | Full | P1-3 |
| Build | `bun run build` (turbo / `--filter` equivalent) | Full | P1-3 |
| Git hygiene | `git status --porcelain` must be empty | Full | P2-3 (git-status hygiene) |
| Placeholder completeness | `grep -r '@SCOPE/' <root>` must return 0 hits | Fast | P2-1 (placeholder rewrite) |

**R2: Regression checks (workspace orchestration + package boundaries)**

| Check | Method | Findings Addressed |
| --- | --- | --- |
| Workspace dep-completeness | Parse all `import ... from '@<scope>/*'`, cross-reference against `workspace:*` in each `package.json` | P2-2 (dep-completeness) |
| Package boundary direction | Assert no `packages/*` imports from `apps/*`; assert no `apps/*` imports from sibling `apps/*` | P2-3 (package-boundary) |
| Script-consistency | For each root `--filter` script, verify target script exists in ≥1 workspace `package.json` | P3-1 (script-consistency) |
| Scope rewrite regression | Assert zero `@SCOPE/` tokens after `applyScope()` | P2-1 |

**R3: Fast per-slice gates vs full smoke tests**

| Gate Type | Checks | When to Run |
| --- | --- | --- |
| **Fast (per-slice)** | Placeholder completeness, package-boundary static analysis, script-consistency, dep-completeness | Every absorption slice, pre-merge |
| **Full (smoke)** | `bun install` → `bun run lint` → `bun run typecheck` → `bun run test` → `bun run build` → `git status --porcelain` | Post-promotion, pre-release, CI on PR |

**R4: Current test harness gaps and minimum evidence**

| Gap | Current State | Minimum Evidence Required |
| --- | --- | --- |
| Mono-mode integration test | Does not exist (`test-setup.test.ts:109-160` only tests `app` mode) | One test: rsync → `runSetupDirect('mono')` → install → check → build → scope assertion → git-status assertion |
| `.nothrow()` suppression | `createRealRunner` swallows all failures (`test-setup.ts:73-75`) | Remove `.nothrow()`; add explicit `expect(exitCode).toBe(0)` on install and check |
| Post-promotion verify | `setupWorkspace()` does not verify (`setup.ts:269-297`) | Either embed verification in `runSetup` for `--check` mode, or document `test:setup` as mandatory gate |
| Clean test coverage | `clean.test.ts` does not cover scaffold-dir cleanup | Test each `clean.ts` TARGETS entry |
| Scaffold install behavior | `scaffold-install.test.ts` only tests symlinks | Integration test: `bun install` in scaffold, verify `@SCOPE/*` resolves |
| `.prototools` | Copied but not verified | Assert `bun --version` matches pinned version |

## Key Design Decisions

1. **Fast vs full gate distinction**: Fast gates are static-analysis checks (no install/build needed). Full gates run the actual install/build pipeline. This split allows rapid iteration during absorption while preserving a full smoke gate for release.

2. **`SPUR_PROVENANCE_OVERRIDE=1` is NOT a verification substitute**: This flag bypasses the pipeline-run requirement for `testing → done` transition. It does NOT bypass the need for evidence. Review tasks must still cite `file:line` evidence in their findings.

3. **`@SCOPE/` is not a defect**: `applyScope()` rewrites it at setup time (`setup.ts:204-220`). The defect is the absence of a post-rewrite completeness assertion — a file outside the 4 glob patterns retains the placeholder silently.

4. **Turbo drift (ADR-006 supersession)**: ADR-001 declared Turborepo but no `turbo.json`/dependency/commands exist. ADR-006 will supersede ADR-001, replacing Turbo with Bun-native `--filter`. This is tracked in task 0023's doc-update list but NOT implemented here (review-only task).
### Testing
**Testing**

Review-only task — no code changes to test. Verification of this task's output:

- **Evidence completeness**: Each of the 11 findings cites `file:line` evidence from the actual source files (cross-referenced against task 0020's audit and direct reads of `setup.ts`, `test-setup.ts`, `test-setup.test.ts`, `clean.test.ts`, `scaffold-install.test.ts`).
- **Matrix coverage**: The verification matrix maps all 4 requirements (R1-R4) to specific gates, with each finding addressed by at least one gate.
- **Cross-reference**: Findings are cross-referenced against task 0020's P1 defects (broken `dev`/`build`, missing `@SCOPE/utils` dep, Turbo drift, un-pinned `@types/react`) to confirm the test harness would not catch them.
- **Source verification**: ScoutMonorepoVerification (7m35s runtime) independently verified all findings against the actual `src-monorepo/` scaffold and `scripts/divergence/` source code.
### Review
**Review**

Post-implementation reflection — this is a review-only task, so "implementation" means the verification matrix document itself.

- **What went well**: The 11 findings map cleanly to the 4 requirements. The fast/full gate distinction (R3) provides a clear separation of concerns for the absorption workflow.
- **What remains to fix before closing**: Nothing — this task produces findings and a matrix, not code. The implementation of the matrix (automated tests, `--check` mode) is future work for a `code` task.
- **Back-issues**: None surfaced by this review.

| Severity | File | Finding | Recommendation |
| -------- | ---- | ------- | -------------- |
| P1       |      | None — review task, no code changes. | N/A |
| P2       |      | None — review task, no code changes. | N/A |
### References
**References**

- Task 0020: `docs/tasks/0020_audit-the-ts-base-monorepo-scaffold-against-its-mode-contrac.md` — original audit producing 16 findings (4 P1, 7 P2, 3 P3, 2 P4).
- Task 0023: `docs/tasks/0023_*.md` — Bun-only workspace orchestration contract (ADR-006 supersession of ADR-001).
- `scripts/divergence/setup.ts:204-220` — `applyScope()` placeholder rewrite.
- `scripts/divergence/setup.ts:269-297` — `setupWorkspace()` promotion path.
- `scripts/divergence/test-setup.ts:51-78` — `createRealRunner` with `.nothrow()`.
- `scripts/tests/divergence/setup.test.ts:109-160` — app-mode-only integration test.
- `scripts/tests/divergence/clean.test.ts` — clean test coverage gaps.
- `scripts/tests/divergence/scaffold-install.test.ts` — scaffold install test gaps.
- ScoutMonorepoVerification: 7m35s runtime, comprehensive verification matrix synthesis (agent transcript available).
- `docs/00_ADR-mono.md` — ADR-001 (Turbo, to be superseded by ADR-006).
- `AGENTS-mono.md` — monorepo mode operations manual.
### History
- 2026-07-16T00:22:04.597Z todo → wip (system)
- 2026-07-16T00:30:03.734Z wip → testing (system)
- 2026-07-16T00:30:08.487Z testing → done (system)
