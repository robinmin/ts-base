---
template: review
schema_version: 1
name: "Audit spur-new for reusable monorepo engineering patterns within the locked boundary"
description: ""
status: Done
type: review
profile: standard
feature_id: A
parent_wbs: null
priority: P0
tags: ["wayfinder:research", "monorepo", "review", "source-audit"]
dependencies: []
created_at: "2026-07-15T22:32:15.121Z"
updated_at: "2026-07-15T23:53:37.163Z"
---

## 0021. Audit spur-new for reusable monorepo engineering patterns within the locked boundary

### Background
Wayfinder type: research. Sharp question: Which patterns proven in `~/xprojects/spur-new` are genuinely reusable in a minimal Bun + TypeScript + Biome monorepo scaffold without importing product-specific behavior?

Audit baseline: `spur-new` commit `cc8892ddac684b10c5fee716e855a06f5d6ca8a2`. The reviewed source paths were clean against that commit. This task records candidates and authorizes no adoption. Target ADRs and protected-file rules govern later changes.

| Severity | Evidence | Finding | Classification | Disposition |
| -------- | -------- | ------- | -------------- | ----------- |
| P2 | `spur-new/package.json:26-53,98-102`; `ts-base/src-monorepo/package.json:6-22` | Bun workspace catalogs can centralize versions, but the source does not place *every* shared dependency in the catalog (`zod` is repeated at the source root). The previous “zero drift” claim was unsupported. | reusable | Task 0024 owns the Bun-semantics evidence and dependency-policy decision. |
| P2 | `spur-new/package.json:59-61`; `ts-base/src-monorepo/package.json:13,22` | Bun workspace filters are a proven Turbo-free orchestration mechanism. The source’s sequential build chain encodes its product bundling order and is not a generic topology. | monorepo-specific | Keep the Bun-only principle; define the target’s own ordering and failure semantics in task 0023. Do not copy the source command verbatim. |
| P2 | `spur-new/apps/server/src/index.ts:13-34`; `ts-base/src-monorepo/apps/server/src/index.ts` | The source isolates server entry-point logic behind injected dependencies and an `import.meta.main` boundary, improving deterministic tests. | reusable | Candidate for the target server entry point; adapt only the dependency-injection seam. |
| P2 | `spur-new/apps/cli/src/index.ts:38-48,157-168`; `ts-base/src-monorepo/apps/cli/src/cli.ts` | The source returns an exit code from testable CLI logic and calls `process.exit` only at the executable boundary. Its command implementation remains product-specific. | reusable | Candidate for the target CLI boundary; hand-adapt the exit/output injection pattern, not the source commands. |
| P2 | `spur-new/packages/contracts/src/index.ts:8-34`; `ts-base/src-monorepo/packages/api/src/contracts/planet.ts:4-35`; `ts-base/docs/00_ADR-mono.md:38-54` | A shared schema/contract boundary is proven in both projects. The target already owns Zod schemas and oRPC contracts in `packages/api`; it is not “partially adopted.” | reusable | Already adopted. No rename or boundary change. |
| P2 | `spur-new/packages/contracts/src/shared.ts:8-39`; `spur-new/apps/server/src/middleware/error-handler.ts:108-175`; `ts-base/src-monorepo/apps/server/src/app.ts:2-20`; `ts-base/docs/00_ADR-mono.md:48-54` | The source’s envelope and resolver are coupled to its Hono/domain errors. The target’s binding decision uses typed `ORPCError` responses and an interceptor for unexpected errors. A second envelope would create competing error contracts. | rejected | Do not absorb directly. A generic envelope may become a separate `ts-libs-candidate` only after another real consumer and a dedicated extraction review exist. |
| P3 | `spur-new/tooling/typescript/{base,server,react}.json`; `ts-base/src-monorepo/tooling/typescript/{base,server,react}.json` | Layered runtime-specific TypeScript presets keep compiler policy centralized. | reusable | Already adopted. |
| P3 | `spur-new/tsconfig.json:1-5`; `ts-base/scripts/divergence/setup.ts:289-292` | A root no-op `tsconfig` can act as an editor anchor, but the target setup deliberately removes the root config for monorepo mode. The prior IDE-failure claim had no reproduction evidence. | monorepo-specific | Deferred pending a reproduced editor/tooling problem; any later adoption includes coordinated setup and ADR changes. |
| P3 | `spur-new/bunfig.toml:1-5`; `ts-base/bunfig.toml:1-5` | Disabling telemetry and exact installs are already target defaults. `smol = true` is source-specific and no target benefit was measured. | reusable | Already adopted for `telemetry` and `exact`; do not add `smol` without evidence. |
| P3 | `spur-new/.lefthook.yml`; `ts-base/.lefthook.yml` | The commit-msg/pre-commit/pre-push split is shared and proven. | reusable | Already adopted. |
| P3 | `spur-new/.github/workflows/ci.yml`; `ts-base/.github/workflows-mono/ci.yml:26-32`; `ts-base/scripts/divergence/setup.ts:183-191` | The target already ships a monorepo CI workflow and promotes it during setup. The previous “no CI” finding was false. Workflows are protected files under the project safety rules. | reusable | Already adopted. No workflow edit is authorized by this task. |
| P3 | `spur-new/packages/contracts/tests/contract.test.ts`; `ts-base/src-monorepo/packages/api/tests/planet.test.ts` | Package-local contract tests exercise shared boundary behavior without app coupling. | reusable | Already adopted. |
| P3 | `spur-new/apps/server/package.json:12`; `spur-new/tests/setup.ts`; `ts-base/src-monorepo/apps/server/package.json` | A test preload is useful when tests require process-wide setup, but the source preload contains project harness concerns and the target has no demonstrated need. | project-specific | Do not pre-create setup infrastructure. Add it only with a concrete global test fixture. |
| P3 | `spur-new/packages/config/src/index.ts`; `spur-new/packages/config/src/loader.ts`; `ts-base/src-monorepo/packages/config/src/index.ts` | Splitting a runtime-safe config core from a filesystem/YAML loader supports the source’s multiple runtimes. That complexity is not part of the minimal target scaffold. | project-specific | Reject as a default; reconsider only when a generated project genuinely shares config across incompatible runtimes. |
| P3 | `spur-new/packages/app/package.json:6-11` | Granular subpath exports reduce accidental imports once a package has independently consumed public modules. The current exports are source-domain services. | project-specific | Do not document speculative target subpaths. Add exports when concrete target modules and consumers exist. |
| P3 | `spur-new/package.json:59` | Workspace-wide cleaning is useful, but the source implementation uses Unix `rm`/`find` and is unsuitable as a portable template command. | monorepo-specific | Keep as a candidate concept; if required, implement with Bun APIs or per-workspace scripts rather than copying the shell command. |
| P4 | `spur-new/packages/domain/src/types.ts:1-15` | Type-only barrels can stabilize a public surface, but adding empty or speculative barrels increases indirection. | reusable | Apply only when a package has multiple public type modules; no scaffold change now. |
| P4 | `spur-new/packages/domain/src/dao/base.ts:1-4` | The four-line prefixed-ID helper has one observed consumer family and does not justify a shared-library extraction by itself. | rejected | Keep local until independent consumers establish a reusable contract. |
| P4 | `spur-new/packages/domain/src/dao/run-dao.ts:2,17-19` | `EntityDao` is imported from the existing `@gobing-ai/ts-db`; it is not a newly discovered extraction candidate. | rejected | No `ts-libs` extraction task. Review its existing package separately only if the target selects that database abstraction. |
| P4 | `spur-new/AGENTS.md` | The source agent guide is dominated by its product/harness workflow. Generic documentation routing already exists in the target and source-specific guidance is outside the locked boundary. | project-specific | Do not absorb source workflow or harness guidance. |
| P4 | `spur-new/biome.json` | Astro overrides are tied to the source web stack. | rejected | Do not adopt. |

Coverage of R1: manifests/workspaces (rows 1-2, 16), app boundaries (3-4), package boundaries (5, 14-15, 17), configuration (7-10, 13), contracts/errors (5-6), tests (3-4, 12-13), and agent guidance (20). Product implementation details were used only to prove coupling and were excluded from recommendations.
### Requirements
R1. Review package manifests, workspace conventions, app/package boundaries, configuration, contracts, error handling, tests, and agent guidance.
R2. Exclude `.spur/` and Spur product subsystems.
R3. Classify findings as reusable, monorepo-specific, project-specific, `ts-libs-candidate`, or rejected.
R4. Cite source files and verification evidence for every proposed pattern.
### Acceptance Criteria
```gherkin
Feature: Evidence-backed source-pattern audit

  @docs-only
  Scenario: AC1 [docs-only]: Every finding cites source evidence, and target comparisons cite target evidence where they affect disposition (R4).
    Given the source and target audit evidence
    When each finding is evaluated
    Then every finding has source evidence and each target-dependent disposition has target evidence

  @docs-only
  Scenario: AC2 [docs-only]: Every finding uses exactly one allowed classification: `reusable`, `monorepo-specific`, `project-specific`, `ts-libs-candidate`, or `rejected` (R3).
    Given the locked classification vocabulary
    When each finding is classified
    Then exactly one allowed classification is assigned

  @docs-only
  Scenario: AC3 [docs-only]: The findings cover all R1 surfaces: manifests, workspace conventions, app/package boundaries, configuration, contracts, error handling, tests, and agent guidance.
    Given the engineering surfaces listed in R1
    When the audit coverage is mapped
    Then every surface is represented by cited findings

  @docs-only
  Scenario: AC4 [docs-only]: Source product subsystems and harness behavior are excluded from adoption recommendations (R2).
    Given the locked source boundary in R2
    When recommendations are classified
    Then product and harness behavior is excluded from adoption recommendations

  @docs-only
  Scenario: AC5 [docs-only]: Already-adopted target capabilities are identified with target evidence and no redundant action.
    Given a source pattern already exists in the target
    When its disposition is recorded
    Then it is marked already adopted with target evidence and no duplicate action
```
### Q&A
**Q: Which findings are actionable now?**
A: Only the server and CLI entry-point seams are concrete, low-coupling adaptation candidates. Catalog policy, Bun workspace orchestration details, root TypeScript anchoring, and clean semantics belong to tasks 0024, 0023, or later evidence-backed work.

**Q: Why is the source error envelope rejected for direct absorption?**
A: The target’s binding monorepo ADR already standardizes typed oRPC errors. Importing a Hono/domain-specific envelope would create a second public error model. A runtime-agnostic abstraction can be considered for `ts-libs` only after a separate extraction review proves multiple consumers.

**Q: Why are there project-specific findings when both repositories use Bun and TypeScript?**
A: A shared toolchain does not make product boundaries reusable. The source’s config loader split, test preload, subpath exports, agent workflow, Astro overrides, and ordered build chain exist for its own runtime and packaging constraints.
### Design
This review uses four disposition rules:

1. Current target evidence determines whether a source pattern represents a gap.
2. Reusability is judged against the binding monorepo ADR, minimal-scaffold goal, and protected-file rules.
3. Hand adaptation applies to generic seams; product commands, error codes, loaders, and harness behavior stay excluded.
4. Independent consumers and a separate extraction task are evidence for a `ts-libs-candidate`; tiny local helpers and existing external abstractions do not meet that bar here.

Result: 21 findings — 10 reusable (6 already adopted, 2 concrete adaptation candidates, 2 conditional), 3 monorepo-specific, 4 project-specific, and 4 rejected. This research task imports no code.
### Plan
- [x] Pin and inspect the clean source baseline for the R1 surfaces.
- [x] Compare every proposed target gap against current `ts-base` code, setup behavior, and the monorepo ADR.
- [x] Classify each finding under the locked R3 vocabulary and cite evidence.
- [x] Exclude source product and harness behavior from recommendations.
- [x] Separate already-adopted capabilities, concrete adaptation candidates, deferred decisions, and rejected copies.
- [x] Verify the corrected audit with task checks and focused source tests.
### Solution
Completed a review-first source audit against `spur-new` commit `cc8892ddac684b10c5fee716e855a06f5d6ca8a2` and corrected the target comparison. The key source seams are `spur-new/apps/server/src/index.ts:13-34` and `spur-new/apps/cli/src/index.ts:38-48,157-168`; binding target constraints are recorded in `ts-base/docs/00_ADR-mono.md:38-54`.

Concrete adaptation candidates:

- Server entry-point dependency injection and `import.meta.main` isolation.
- CLI exit-code/output injection with `process.exit` kept at the executable boundary.

Already adopted and requiring no action:

- Shared Zod/oRPC contract ownership in `packages/api`.
- Layered TypeScript presets.
- Bun telemetry disabled and exact installs.
- Lefthook stage separation.
- Mode-specific CI promotion.
- Package-local contract tests.

Deferred to evidence or dedicated tasks:

- Workspace catalogs and dependency policy (0024).
- Bun-only orchestration semantics (0023).
- Root TypeScript editor anchor and workspace cleaning.

Rejected for direct absorption:

- The source Hono/domain error envelope, product config-loader split, speculative subpath exports/preloads, Unix-only clean implementation, premature ID-helper extraction, duplicate `EntityDao` extraction, source agent workflow, and Astro overrides.

No source files, target runtime code, CI workflows, or shared-library repositories were modified.
### Testing
Coverage: N/A — documentation/research task; no runtime code path changed.

**Requirement verification**

| Requirement | Result | Evidence |
| ----------- | ------ | -------- |
| R1 | MET | The Background matrix covers manifests/workspaces, app and package boundaries, configuration, contracts/errors, tests, and agent guidance at `docs/tasks/0021_audit-spur-new-for-reusable-monorepo-engineering-patterns-wi.md:20`. |
| R2 | MET | Product and harness implementation is excluded from recommendations; coupled patterns are `project-specific` or `rejected`. |
| R3 | MET | All 21 rows use exactly one allowed classification. |
| R4 | MET | Every row contains source evidence; target-dependent dispositions also cite current target files. |

**Acceptance-criteria verification**

| Criterion | Result | Evidence type | Evidence |
| --------- | ------ | ------------- | -------- |
| AC1 [docs-only] | MET | static-ref | Every matrix row has source evidence; target-gap claims include target refs. |
| AC2 [docs-only] | MET | static-ref | The classification column uses only the R3 vocabulary. |
| AC3 [docs-only] | MET | static-ref | The R1 coverage paragraph maps every required surface to matrix rows. |
| AC4 [docs-only] | MET | static-ref | No product subsystem or harness feature is recommended for absorption. |
| AC5 [docs-only] | MET | static-ref | Contracts, TypeScript presets, Bun settings, hooks, CI, and tests are marked already adopted. |

**Fresh checks**

| Check | Result | Notes |
| ----- | ------ | ----- |
| `spur task check 0021 --strict-core --json` | PASS | Zero findings. |
| `spur feature check A --json` | PASS | Task 0021’s five scenarios are covered. Two feature-level frontier scenarios remain intentionally uncovered until implementation-route and generated-project work is charted. |
| `bun run lint` | PASS | Biome, root TypeScript, and scaffold TypeScript checks passed. |
| `bun run test` | PASS | 166 tests, 0 failures, 99.17% line / 99.82% function coverage. |
| `bun run --cwd src-monorepo build` | PASS | CLI, server, and web workspace builds completed using Bun filters. |

**Design conformance**

| Claim | Status | Evidence |
| ----- | ------ | -------- |
| Current target evidence determines gaps | DONE | The audit corrected the false contracts, CI, Bun-settings, and catalog claims with target/source refs. |
| Preserve binding target boundaries | DONE | Error-envelope absorption is rejected in favor of `docs/00_ADR-mono.md:38-54`. |
| Adapt generic seams only | DONE | Only server dependency injection and CLI exit isolation remain concrete candidates. |
| Avoid premature shared abstractions | DONE | `createId` extraction and duplicate `EntityDao` extraction are rejected. |

**SECUA review**

- Security: MET — no secret, external-input, dependency, or runtime surface was introduced.
- Efficiency: N/A — documentation-only audit.
- Correctness: MET — the Review section now matches the corrected evidence and contains no stale target-gap claims.
- Usability: MET — each finding carries classification, disposition, and specific evidence.
- Architecture: MET — dispositions preserve the monorepo ADR, minimal-scaffold boundary, and protected-file rules.

No blocker, major finding, or task-0021 traceability warning remains.
### Review
**Functional traceability**

| Requirement | Status | Evidence |
| ----------- | ------ | -------- |
| R1 | MET | The Background matrix covers manifests/workspaces, app and package boundaries, configuration, contracts/errors, tests, and agent guidance at `docs/tasks/0021_audit-spur-new-for-reusable-monorepo-engineering-patterns-wi.md:20`. |
| R2 | MET | Product-specific behavior is classified `project-specific` or `rejected`; no product or harness subsystem is recommended for absorption. |
| R3 | MET | All 21 findings use one allowed classification: 10 reusable, 3 monorepo-specific, 4 project-specific, and 4 rejected. |
| R4 | MET | Each finding cites source evidence, and target-dependent dispositions cite current `ts-base` evidence. |

Functional Verdict: PASS.

**SECUA findings**

| Severity | Dimension | Evidence | Finding | Resolution |
| -------- | --------- | -------- | ------- | ---------- |
| P2 | Correctness | `ts-base/src-monorepo/packages/api/src/contracts/planet.ts:4-35`; `ts-base/docs/00_ADR-mono.md:38-54` | The earlier review incorrectly described target contract ownership as partial. | Resolved: the audit now records the Zod/oRPC boundary as already adopted and keeps `packages/api` unchanged. |
| P2 | Correctness | `ts-base/.github/workflows-mono/ci.yml:26-32`; `ts-base/scripts/divergence/setup.ts:183-191` | The earlier review incorrectly claimed that monorepo CI was absent. | Resolved: the audit now records mode-specific CI promotion as already adopted and authorizes no protected-workflow edit. |
| P2 | Architecture | `spur-new/apps/server/src/middleware/error-handler.ts:108-175`; `ts-base/src-monorepo/apps/server/src/app.ts:2-20` | Directly importing the source error envelope would conflict with the target’s binding typed-oRPC error model. | Resolved: direct absorption is rejected; any generic library proposal needs an independent extraction review. |
| P3 | Correctness | `spur-new/package.json:26-53,98-102` | The earlier review overstated catalog coverage as every shared dependency with zero drift; source root `zod` remains separately pinned. | Resolved: catalogs are an evidence candidate owned by task 0024, not an automatic adoption. |
| P3 | Usability | `spur-new/package.json:59` | The source clean command is Unix-specific and unsuitable for direct template reuse. | Resolved: only the cleaning concept remains conditional; a target implementation would use Bun APIs or workspace scripts. |

No open blocker or major SECUA finding remains. Security and efficiency are N/A for this documentation-only audit; it introduces no runtime path, dependency, secret, input boundary, or I/O behavior.

**Architecture depth**

- Shallow module: no runtime module was added or changed.
- Tight coupling / wrong seam: the audit explicitly preserves `packages/api` contract ownership and rejects the competing error-envelope seam.
- Weak locality: each candidate’s source evidence, target comparison, classification, and disposition are co-located in one matrix.
- Poor test surface: N/A for a documentation-only research artifact; executable target gates remain recorded in Testing.

No deepening candidate is warranted in task 0021’s scope. The two reusable implementation seams—server dependency injection and CLI exit-boundary isolation—are correctly left as later hand-adaptation candidates rather than silently implemented here.

Review Verdict: PASS.
### References

- Source: `~/xprojects/spur-new/` (read-only audit, no modifications)
- Task 0020: `docs/tasks/0020_audit-the-ts-base-monorepo-scaffold-against-its-mode-contrac.md` — monorepo scaffold audit (16 findings)
- Task 0023: `docs/tasks/0023_define-the-bun-only-workspace-orchestration-contract-for-mon.md` — Bun-only workspace orchestration contract (ADR-006 supersession)
- `AGENTS.md` — ts-base boundary rules (ts-base vs ts-libs)

### History
- 2026-07-15T23:21:27.146Z todo → wip (system)
