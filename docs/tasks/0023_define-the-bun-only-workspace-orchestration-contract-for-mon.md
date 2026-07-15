---
template: meta
schema_version: 1
name: "Define the Bun-only workspace orchestration contract for monorepo mode"
description: ""
status: done
type: meta
profile: standard
feature_id: A
parent_wbs: null
priority: P0
tags: ["wayfinder:research", "bun", "workspaces", "architecture"]
dependencies: []
created_at: "2026-07-15T22:32:15.123Z"
updated_at: "2026-07-15T23:21:06.971Z"
---

## 0023. Define the Bun-only workspace orchestration contract for monorepo mode

### Background

Wayfinder type: research. Sharp question: After removing Turborepo, what exact Bun workspace script semantics, ordering, failure propagation, and generated-project documentation should replace the obsolete orchestration contract?

### Requirements
R1. Treat direct Bun workspace orchestration as locked and identify every monorepo-mode contract affected.
R2. Determine which tasks may run in parallel and which require dependency order.
R3. Verify behavior against the pinned Bun version and local source evidence.
R4. Produce the required ADR supersession and derived-document update list without implementing it.
### Acceptance Criteria
- [x] AC1: Every monorepo-mode contract referencing Turborepo is identified and listed (R1) — 3 tiers: authoritative docs, derived docs, scaffold source. See Solution § R1.
- [x] AC2: Each script's parallel vs dependency-ordered semantics is classified with rationale (R2) — `dev` parallel, `build`/`test`/`typecheck` dep-ordered, `lint` root-only. See Solution § R2.
- [x] AC3: Bun `--filter` behavior verified against pinned Bun 1.3.14 using primary sources (R3) — 8 behaviors confirmed via Bun docs + v1.3.9 blog. See Solution § R3.
- [x] AC4: ADR-006 supersession text and 5-item doc update list produced without implementing (R4) — full text in `local://task-0023-research.md` § R4.
- [x] AC5: No source files modified — this task produces the contract only, not the implementation.
### Q&A

<!-- Clarifications and decisions made during refinement. Keep empty if none. -->

### Design
**Approach:** Research-only (meta template). Produce the Bun-native orchestration contract as an ADR supersession + doc update list. No implementation.

**Key decisions:**

1. **Supersede, don't amend.** ADR-001 is wrong in its core claim (Turborepo orchestration). A new ADR-006 that explicitly supersedes ADR-001 is cleaner than editing ADR-001 in place — the supersession chain is auditable.

2. **Keep the layout, drop the orchestrator.** ADR-001's `apps/` + `packages/` split is correct; only the Turborepo claim is wrong. ADR-006 preserves the layout and replaces only the orchestration mechanism.

3. **`--if-present` is a P2 finding, not part of this task's implementation.** The research identifies the gap; a follow-up task implements the fix. This keeps the research/implementation boundary clean.

4. **Accept caching loss.** Bun `--filter` has no task caching. For a starter template this is acceptable — the monorepo is small, CI is fast, and adding Turbo purely for cache would reintroduce the phantom dependency. Documented as a tradeoff in ADR-006.

**Tradeoffs:** See ADR-006 § Tradeoffs in the research file. The main loss is Turbo's remote/local task cache and declarative task graph. Both are acceptable for a starter template; projects that outgrow Bun-native orchestration should add a new ADR.
### Plan

<!-- Ordered checklist. Fill before moving to todo/wip. -->

### Solution
R1 — Affected contracts (exhaustive inventory) at `local://task-0023-research.md` § R1. Three tiers: authoritative docs (`docs/00_ADR-mono.md:13` ADR-001), derived docs (`AGENTS-mono.md:7` + 9 more lines L21/L28/L84/L86-L89/L98/L121), scaffold source (`scripts/divergence/clean.ts:7` + L9/L12 dead `.turbo` entries, `scripts/_modes.ts:1` missing `MONO_SCRIPTS`).

R2 — Parallel vs dependency-ordered: Bun `--filter` provides automatic dependency-ordered parallel execution. `dev` is parallel/no-dep-order (long-lived); `build`/`test`/`typecheck` are dep-ordered. Critical gap: `dev` and `build` scripts lack `--if-present`, causing errors on packages without those scripts. Evidence: `src-monorepo/package.json:12` (dev script), `src-monorepo/package.json:13` (build script); all 4 packages (`src-monorepo/packages/api/package.json`, `config`, `db`, `utils`) lack `dev` and `build` scripts. Full classification table in research file § R2.

R3 — Verified against Bun 1.3.14 (matches `.prototools:1` pin). 8 behaviors confirmed via Bun docs + v1.3.9 blog. Local evidence: `src-monorepo/package.json:12` scripts already use `bun run --filter` (not `turbo run`); no `turbo` in any `devDependencies`; no `turbo.json` exists. The implementation is already Bun-native — only docs and ADR lag behind.

R4 — ADR-006 supersedes ADR-001 (full text in research file § R4). 5-item doc update list in dependency order: (1) `docs/00_ADR-mono.md` add ADR-006, (2) `AGENTS-mono.md` replace 10 Turbo refs, (3) `src-monorepo/package.json` add `--if-present`, (4) `scripts/divergence/clean.ts` remove `.turbo` entries, (5) `scripts/_modes.ts` add `MONO_SCRIPTS` (P3 separate task). This task produces the contract only; implementation deferred.
### Testing
N/A — research/meta task. No code changes to test. Verification was against primary sources (Bun docs + v1.3.9 blog) and local source evidence (package.json files, clean.ts, _modes.ts). All 8 Bun `--filter` behaviors confirmed for version 1.3.14. See Solution § R3 for the verification matrix.
### Review
**Findings:**

| Sev | Finding | Evidence |
|---|---|---|
| P2 | `dev` and `build` root scripts lack `--if-present`, causing errors on packages without those scripts | `src-monorepo/package.json` L12-13; packages/{api,config,db,utils} have no `dev` or `build` script |
| P2 | ADR-001 declares Turborepo orchestration that was never implemented | `docs/00_ADR-mono.md` L13-32; no `turbo.json`, no `turbo` dependency anywhere |
| P3 | `scripts/_modes.ts` has no `MONO_SCRIPTS` export — root scripts are hand-authored, could drift from other modes | `scripts/_modes.ts` exports `APP_SCRIPTS` and `LIB_SCRIPTS` but no monorepo equivalent |
| P3 | `scripts/divergence/clean.ts` has 3 dead `.turbo` references | `clean.ts` L7, L9, L12 — no `.turbo` directory is ever created |
| P4 | AGENTS-mono.md has 10 stale Turbo references across 8 lines | `AGENTS-mono.md` L7, L21, L28, L84, L86, L87, L88, L89, L98, L121 |

**Residual risk:** Low. The research output is complete; implementation risk is in the follow-up tasks that apply the changes.

**Disposition:** PASS — all 4 requirements (R1-R4) satisfied. AC1-AC5 all checked. No source files modified (AC5).
### References
- Task 0020: Audit of `src-monorepo/` against `docs/00_ADR-mono.md` and `AGENTS-mono.md` (predecessor — identified the Turbo drift)
- `docs/00_ADR-mono.md` ADR-001: Turborepo + Bun-workspaces layout (to be superseded)
- [Bun --filter docs](https://bun.com/docs/pm/filter) — primary source for workspace script semantics
- [Bun v1.3.9 blog](https://bun.com/blog/bun-v1.3.9) — `--parallel`/`--sequential`/`--no-exit-on-error` introduction
- `src-monorepo/package.json` — root scripts (already use `bun run --filter`)
- `scripts/divergence/clean.ts` — dead `.turbo` references
- `scripts/_modes.ts` — missing `MONO_SCRIPTS` export
- Research output: `local://task-0023-research.md` (full R1-R4 with ADR-006 text)
### History
- 2026-07-15T23:19:08.281Z wip → testing (system)
- 2026-07-15T23:21:06.971Z testing → done (system)
