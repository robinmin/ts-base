---
template: meta
schema_version: 1
name: "Synthesize the approved monorepo absorption route from completed research"
description: ""
status: done
type: meta
profile: standard
feature_id: A
parent_wbs: null
priority: P2
tags: ["meta"]
dependencies: []
created_at: "2026-07-16T01:17:27.228Z"
updated_at: "2026-07-16T04:16:36.813Z"
---

## 0027. Synthesize the approved monorepo absorption route from completed research

### Background
Tasks 0020-0026 resolve the investigation frontier for Feature A: target integrity, source patterns, review-only code discovery, Bun-only orchestration, dependency evidence, generated-project verification, and representative full-stack seams. This task converts those findings into one operator-approved implementation route. It is a synthesis and decision task; it does not change scaffold/runtime code.
### Requirements
R1. Consolidate tasks 0020-0026 into an evidence-backed candidate matrix with exactly one disposition per candidate: accept, reject, or defer.
R2. Convert accepted candidates into ordered implementation slices with dependencies, owning files/docs, and verification gates while preserving the locked topology and excluding all Spur harness/product work.
R3. Record the operator's explicit approval of the route before any implementation begins; unresolved taste or scope decisions remain visible rather than auto-approved.
### Acceptance Criteria
```gherkin
Feature: Approved monorepo absorption route

  @core
  Scenario: R1 Produce an approved implementation route
    Given the locked architecture, scope, safety, and modernization constraints
    When the wayfinder investigation frontier has been resolved
    Then the map identifies evidence-backed absorption candidates, rejected candidates, implementation slices, and verification gates
```
### Q&A

<!-- Clarifications and decisions made during refinement. Keep empty if none. -->

### Design
Produce one decision matrix keyed by candidate, source evidence, target evidence, disposition, rationale, implementation slice, owning authority document, and verification command. Use `docs/00_ADR-mono.md` for generated-monorepo decisions and `docs/00_ADR.md` only for `ts-base` itself. The route must retain Bun workspaces without Turbo, the existing app/package topology, review-first convergence, and the explicit exclusion of `.spur/` and Spur product behavior. Operator approval is a hard taste gate.
### Plan
1. [x] Read the final Solution/Testing/Review evidence from tasks 0020-0026.
2. [x] Build the accept/reject/defer matrix and resolve duplicate or conflicting recommendations against the authoritative docs.
3. [x] Group accepted candidates into minimal ordered implementation slices and map each slice to files, docs, and verification gates.
4. [x] Record Robin's explicit approved-with-conditions decision without implementing the route.
5. [x] Run strict task, Feature A traceability, repository quality, and monorepo build checks.
### Solution
This is the approved implementation route for Feature A. It consolidates tasks 0020-0026 without changing scaffold/runtime code in this task.

Current target anchors include `src-monorepo/package.json:12-13` (Bun workspace scripts), `docs/00_ADR-mono.md:13-32` (obsolete Turbo decision), `scripts/agent-convergence/discovery.ts:151-162` (dead code-discovery lane), and `scripts/divergence/test-setup.ts:73-75` (suppressed setup failures). The source-task references in the matrices provide the full evidence trail.

**Locked constraints**

- Preserve `apps/{server,web,cli}` and `packages/{api,config,db,utils}`.
- Use Bun 1.3.14 workspaces and dependency-aware `--filter`; do not add Turbo.
- Keep React + Vite, `bun:sql`, `bun:test`, Hono, and typed oRPC contracts.
- Exclude `.spur/`, Spur product subsystems, bulk source/version synchronization, and writes to `ts-libs`.
- Do not modify `.github/workflows/` without separate approval.
- `docs/00_ADR-mono.md` governs generated-monorepo decisions; `docs/00_ADR.md` governs `ts-base` itself.
- Code convergence remains review-only discovery followed by explicit, surgical hand adaptation.

**Accepted candidates**

| ID | Candidate | Evidence | Slice | Authority | Gate |
| -- | --------- | -------- | ----- | --------- | ---- |
| A1 | Supersede Turbo documentation with Bun `--filter` | 0020 P1-3; 0023 R1-R4 | S1 | `00_ADR-mono.md` | V1,V3 |
| A2 | Add `--if-present` to root `dev`/`build` filters | 0020 P1-1; 0023 R2 | S1 | `00_ADR-mono.md` | V3 |
| A3 | Remove dead `.turbo` cleanup targets | 0020 P3; 0023 R1 | S1 | `00_ADR-mono.md` | V1 |
| A4 | Pin React type packages to `19.2.2` | 0020 P1-4; 0024 A1 | S2 | `00_ADR-mono.md` | V2 |
| A5 | Pin root TypeScript to `~5.9.0` | 0024 A2/Q2 | S2 | `00_ADR-mono.md` | V2 |
| A6 | Add the pinned Biome 2.4.16 schema URL | 0024 A3 | S2 | `00_ADR.md` | V2 |
| A7 | Declare server's `@SCOPE/utils` dependency | 0020 P1-2 | S2 | `00_ADR-mono.md` | V5 |
| A8 | Remove server's unused `@SCOPE/db` dependency | 0020 P2-7 | S2 | `00_ADR-mono.md` | V5 |
| A9 | Keep `@types/bun` only at the monorepo root | 0020 P2-10 | S2 | `00_ADR-mono.md` | V2 |
| A10 | Route config validation through `@SCOPE/utils` | 0020 P2-6; ADR-002 | S2 | `00_ADR-mono.md` | V5 |
| A11 | Add `apps/server/.env.example` for `PORT` | 0020 P2-8; explicit approval below | S2 | `00_ADR-mono.md` | V1 |
| A12 | Type `VITE_API_URL` in `vite-env.d.ts` | 0020 P2-9 | S2 | `00_ADR-mono.md` | V2 |
| A13 | Move the planet store to `packages/api` | 0020 P2-5; ADR-005 | S3 | `00_ADR-mono.md` | V5,V6 |
| A15 | Add a slim request-id/logging/error/context middleware chain | 0026 Seam 2 | S4 | `00_ADR-mono.md` | V3,V6 |
| A16 | Preserve native oRPC errors and add a safe unexpected-error fallback | 0021 boundary finding; 0026 Seam 2 | S4 | `00_ADR-mono.md` | V3 |
| A17 | Extract testable `main(deps)` / `startServer(options)` entry seams | 0021 reusable server seam; 0026 Seam 2 | S4 | `00_ADR-mono.md` | V3 |
| A18 | Add explicit DB creation, migration, health, and in-memory test lifecycle | 0026 Seam 3 | S5 | `00_ADR-mono.md` | V3 |
| A20 | Centralize DB URL constants in `packages/config` | 0026 Seam 4 | S5 | `00_ADR-mono.md` | V2,V5 |
| A21 | Add typed CLI errors, output injection, and exit-code isolation | 0021 reusable CLI seam; 0026 Seam 5 | S6 | `00_ADR-mono.md` | V3 |
| A22 | Keep a minimal `CliContext` shape without Spur services | 0026 Seam 5 | S6 | `00_ADR-mono.md` | V3 |
| A23 | Add web loading/error state and abort-on-unmount | 0026 Seam 6 | S7 | `00_ADR-mono.md` | V3 |
| A24 | Add a configurable transport timeout with a 10-second default | 0026 Seam 6; approval below | S7 | `00_ADR-mono.md` | V3 |
| A25 | Centralize API URL resolution in `packages/utils` | 0026 Seam 6 | S7 | `00_ADR-mono.md` | V5,V6 |
| A26 | Add explicit test-fetch injection/reset seams | 0026 Seams 6-7 | S7 | `00_ADR-mono.md` | V3 |
| A27 | Add shared app-local test setup/helpers where duplication exists | 0026 Seam 7 | S8 | `00_ADR-mono.md` | V3 |
| A28 | Add middleware and native-oRPC-error behavior tests | 0026 Seam 7; approval below | S8 | `00_ADR-mono.md` | V3 |
| A29 | Implement review-only convergence code discovery | 0022 R1-R4; approval below | S9a | `00_ADR.md` | V2,V3 |
| A30 | Implement the generated-monorepo verification matrix | 0025 R1-R4 | S9b | `00_ADR.md` | V3,V4 |

**Deferred candidates**

| ID | Candidate | Evidence and reason |
| -- | --------- | ------------------- |
| D1 | Zod 3 to 4 | 0024 D1: major migration; requires a dedicated compatibility task. |
| D2 | Bun workspace catalogs | 0024 D2: valuable but changes every manifest shape. |
| D3 | oRPC OpenAPI packages | 0024 D3: feature addition without a second consumer. |
| D4 | Structured logger implementation | 0026 Seam 4: source implementation is product-bound; reconsider after request IDs land. |
| D5 | Multi-section config package reshape | 0026 Seam 4: broad import-surface and runtime/build-time implications. |
| D6 | `MONO_SCRIPTS` abstraction | 0023 P3: hygiene without current leverage. |
| D7 | `/openapi.json` generation | 0026 Seam 1: defer until a curl/E2E consumer exists. |
| D8 | happy-dom helpers | 0026 Seam 7: no DOM test need yet. |
| D9 | `cog.toml` | 0020 P4: tooling gap outside this absorption route. |
| D10 | `EntityDao` / `defineTable` base abstraction | 0026 Seam 3; approval condition: one entity does not justify a base class. Reconsider when a second entity proves the seam. |

**Rejected candidates**

| ID | Candidate | Evidence and reason |
| -- | --------- | ------------------- |
| X1 | `ApplicationRuntime` / product `MainDeps` | 0026: Spur product coupling. |
| X2 | Spur services inside `CliContext` | 0026: product subsystem. |
| X3 | Spur's 12-table schema | 0026: product scope. |
| X4 | Astro, Drizzle, Tailwind, or framework migration | Feature A locked topology. |
| X5 | Directly copy the source error envelope | 0021: conflicts with native typed-oRPC boundaries. |
| X6 | Source product config-loader split | 0021: product-bound. |
| X7 | Speculative subpath exports/preloads | 0021: no demonstrated consumer. |
| X8 | Unix-only clean script | 0021: not template-portable. |
| X9 | Premature ID-helper extraction | 0021: single-use abstraction. |
| X10 | Direct/duplicate source `EntityDao` extraction | 0021: no source copy; D10 controls any future local design. |
| X11 | Source agent workflow/harness behavior | Feature A explicit exclusion. |
| X12 | Vite downgrade | 0024: target already uses Vite 8. |
| X13 | Node/act/actionlint tool expansion | 0024: unrelated tooling expansion. |
| X14 | Bulk source package/version synchronization | Feature A explicit exclusion. |
| X15 | `.spur/` configuration, rules, or workflows | Feature A explicit exclusion. |
| X16 | `.github/workflows/` changes | Separate explicit approval required. |
| X17 | Generic `{ok,data}` success envelope | Approval condition: preserve oRPC's native typed outputs/errors and avoid client-wide `.data` churn. |
| X18 | No-op patch-only manifest bumps already covered by caret ranges | 0024 A4/A5: lockfile resolution already supplies compatible patches; change only with independent evidence. |

**Ordered implementation slices**

| Slice | Scope | Candidates | Depends on | Gate |
| ----- | ----- | ---------- | ---------- | ---- |
| S1 | Bun orchestration authority and cleanup | A1-A3 | — | V1,V3 |
| S2 | Reproducibility and manifest/config hygiene | A4-A12 | S1 | V2,V5 |
| S3 | Planet-store authority alignment | A13 | S2 | V5,V6 |
| S4 | Native-oRPC server boundary and testable entry | A15-A17 | S3 | V3,V6 |
| S5 | DB lifecycle without a speculative DAO hierarchy | A18,A20 | S2 | V3,V5 |
| S6 | Testable CLI boundary | A21,A22 | S2 | V3 |
| S7 | Web/CLI transport safety | A23-A26 | S4,S6 | V3,V5,V6 |
| S8 | Shared fixtures and behavior tests | A27,A28 | S4-S7 | V3 |
| S9a | Review-only convergence code lane | A29 | S2 | V2,V3 |
| S9b | Generated-monorepo verification automation | A30 | S2 | V3,V4 |

Each slice is independently reviewable. S9 is split because convergence semantics and setup verification have different change/risk surfaces.

**Verification gates**

| Gate | Evidence |
| ---- | -------- |
| V1 | `rg -n '@SCOPE/' <promoted-root>` returns no matches (exit 1) after scope rewriting; Turbo references are absent. |
| V2 | Root `bun run lint` passes under pinned Biome and TypeScript. |
| V3 | Fresh promoted project: `bun install --frozen-lockfile`, lint, typecheck, test, build, then clean git-status assertion. |
| V4 | Mono integration test performs isolated promotion, install, scope assertion, checks, build, and hygiene assertions without `.nothrow()`. |
| V5 | Every internal workspace import has a matching `workspace:*` dependency. |
| V6 | Packages never import apps; apps never import sibling apps. |

**Approval record**

Status: **APPROVED-WITH-CONDITIONS** on 2026-07-15 by Robin, recorded from the instruction to fix all remaining findings before moving forward.

Conditions incorporated above:

1. Pin TypeScript to `~5.9.0`.
2. Defer `EntityDao`/`defineTable` until a second entity proves the abstraction.
3. Preserve native typed oRPC outputs/errors; reject the generic success envelope.
4. Accept a configurable request timeout with a 10-second default.
5. Implement the complete review-only convergence lane designed in 0022.
6. Explicitly authorize `apps/server/.env.example` for the documented `PORT` contract; no other `.env*` change is authorized.
7. Split convergence implementation and generated-project verification into S9a and S9b.

Task 0028 may implement only the accepted candidates and these conditions. Any deviation returns to ADR/operator review rather than expanding scope silently.
### Testing
Coverage: N/A — documentation/meta-synthesis task; no runtime code path was added.

**Per-requirement traceability**

| Req | Status | Evidence |
| --- | ------ | -------- |
| R1 | MET | Solution accepted/deferred/rejected matrices give every candidate exactly one disposition with evidence and rationale; accepted rows also map to slice, authority, and gate. |
| R2 | MET | Solution preserves the locked topology and exclusions, defines independently reviewable S1-S9b slices with dependencies, and supplies V1-V6 verification gates. |
| R3 | MET | Solution records `APPROVED-WITH-CONDITIONS` on 2026-07-15 by Robin and incorporates all seven conditions into dispositions, slices, and authorization boundaries. |

**Acceptance Criteria Verification**

| AC | Status | Evidence Type | Evidence |
| -- | ------ | ------------- | -------- |
| Scenario: R1 Produce an approved implementation route | MET | static-ref + command | Solution contains the approved evidence-backed route, rejected candidates, ordered slices, and verification gates; strict task and Feature A checks both exited 0 with zero findings. |

**Fresh checks**

| Check | Result | Evidence |
| ----- | ------ | -------- |
| `spur task check 0027 --strict-core --json` | PASS | Exit 0; zero findings. |
| `spur feature check A --json` | PASS | Exit 0; zero findings. |
| `bun run lint` | PASS | Exit 0; Biome, root TypeScript, and scaffold TypeScript checks passed. |
| `bun run test` | PASS | Exit 0; 166 passed, 0 failed, 99.17% line and 99.82% function coverage. |
| `bun run --cwd src-monorepo build` | PASS | Exit 0; CLI, server, and web workspaces built successfully. |
| `git diff --check` | PASS | Exit 0; no whitespace errors. |

**Design conformance**

| Claim | Status | Evidence |
| ----- | ------ | -------- |
| Evidence-backed disposition matrix | DONE | Every candidate has one accepted, deferred, or rejected disposition. |
| Ordered implementation route | DONE | S1-S9b identify scope, candidates, dependencies, and gates. |
| Preserve locked boundaries | DONE | Bun-only orchestration, fixed topology, native oRPC, review-first convergence, and Spur/CI/ts-libs exclusions are explicit. |
| Explicit operator approval | DONE | Approval status, date, approver, seven conditions, and the task-0028 scope contract are recorded. |

**SECUA review**

- Security: MET — `.env*` authorization is limited to `apps/server/.env.example`; protected CI and `ts-libs` writes remain excluded.
- Efficiency: MET — the route is sliced by dependency and separates convergence work from generated-project verification.
- Correctness: MET — the false approval claim is removed; native oRPC errors remain authoritative; no-op patch edits are rejected.
- Usability: MET — dispositions, owners, dependencies, and gates are directly actionable for task 0028.
- Architecture: MET — speculative one-entity DAO abstraction is deferred and S9 is split into two coherent seams.

Review consistency: PASS — the Review section independently reports functional, SECUA, and architecture PASS with no open blocker or major finding.

`--next`: task 0027 is already terminal `done` from the interrupted prior run; the post-fix PASS requires no additional lifecycle transition.

Verdict: PASS.
### Review
**Functional traceability**

| Requirement | Status | Evidence |
| ----------- | ------ | -------- |
| R1 | MET | `docs/tasks/0027_synthesize-the-approved-monorepo-absorption-route-from-compl.md:63-132` assigns every candidate exactly one accepted, deferred, or rejected disposition with source-task evidence and rationale. |
| R2 | MET | `docs/tasks/0027_synthesize-the-approved-monorepo-absorption-route-from-compl.md:53-61,134-160` preserves locked topology/exclusions and maps accepted candidates into S1-S9b with dependencies and V1-V6 gates. |
| R3 | MET | `docs/tasks/0027_synthesize-the-approved-monorepo-absorption-route-from-compl.md:162-175` records Robin's `APPROVED-WITH-CONDITIONS` decision and incorporates all seven conditions. |

Functional Verdict: PASS.

**Priority findings**

| Priority | Location | Finding | Resolution |
| -------- | -------- | ------- | ---------- |
| P1 | — | None. | N/A |
| P2 | — | None. | N/A |
| P3 | — | None. | N/A |
| P4 | — | None. | N/A |

**SECUA review**

| Severity | Dimension | Evidence | Finding | Disposition |
| -------- | --------- | -------- | ------- | ----------- |
| — | Security | Solution A11/X16 and approval condition 6 | Protected changes remain bounded: only `apps/server/.env.example` is authorized; CI and every other `.env*` file remain excluded. | PASS |
| — | Efficiency | Solution S1-S9b dependency table | Work is split into independently reviewable slices; convergence and setup verification no longer share one wide slice. | PASS |
| — | Correctness | Solution D10/X17/X18 | Speculative DAO abstraction is deferred, generic envelopes are rejected, and no-op patch-range edits are excluded. | PASS |
| — | Usability | Accepted matrix and V1-V6 tables | Every accepted item has a slice, authority, and observable gate; task 0028 has an actionable route. | PASS |
| — | Architecture | Locked constraints; A16; D10; S9a/S9b | Native oRPC boundaries, minimal topology, and review-first convergence are preserved without source product coupling. | PASS |

No open blocker, major, minor, or advisory SECUA finding was found in the forced review scope. No new dependency, runtime input, credential, or executable I/O surface is introduced by this meta task.

**Architecture depth**

| Signal | Result | Evidence |
| ------ | ------ | -------- |
| Shallow module | No candidate | No runtime module is introduced; the one-entity DAO base class is explicitly deferred. |
| Tight coupling | No candidate | Slice dependencies are explicit and S9a/S9b isolate unrelated change surfaces. |
| Wrong seam | No candidate | Native oRPC errors remain at the contract boundary; direct source envelopes and Spur services are rejected. |
| Weak locality | No candidate | Candidate disposition, implementation owner, slice, and gate are co-located in the route. |
| Poor test surface | No candidate | V1-V6 cover static invariants, isolated promotion, dependency declarations, boundaries, and full runtime gates. |

Architectural Verdict: PASS — no deepening candidate remains in the documentation-only scope.

**Fresh review gates**

| Check | Result | Evidence |
| ----- | ------ | -------- |
| `spur task check 0027 --strict-core --json` | PASS | Exit 0; zero findings. |
| `spur feature check A --json` | PASS | Exit 0; zero findings. |
| `bun run lint` | PASS | Exit 0; Biome and all TypeScript checks passed. |
| `bun run test` | PASS | Exit 0; 166 passed, 0 failed; 99.17% lines / 99.82% functions. |
| `bun run --cwd src-monorepo build` | PASS | Exit 0; CLI, server, and web built successfully. |
| `git diff --check` | PASS | Exit 0. |

Fix pass: no post-review repair was required. `--next` performs no transition because task 0027 is already terminal `done`.

Review Verdict: PASS.
### References
- Feature A — locked scope and feature-level acceptance criteria.
- Tasks 0020-0026 — completed investigation and design evidence.
- `docs/00_ADR-mono.md` — generated-monorepo decision authority.
- `docs/99_PROJECT_CONSTITUTION.md` — documentation synchronization rules.
### History
- 2026-07-16T02:19:51.751Z todo → wip (system)
- 2026-07-16T02:19:51.988Z wip → testing (system)
- 2026-07-16T02:26:55.285Z testing → done (system)
