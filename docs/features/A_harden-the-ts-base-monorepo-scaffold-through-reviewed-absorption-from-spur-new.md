---
schema_version: 1
id: "A"
name: "Harden the ts-base monorepo scaffold through reviewed absorption from spur-new"
status: backlog
priority: P0
tags: []
created_at: "2026-07-15T22:30:18.948Z"
updated_at: "2026-07-16T00:55:44.414Z"
---

# A: Harden the ts-base monorepo scaffold through reviewed absorption from spur-new

## Goal
A validated, minimal, production-grade Bun + TypeScript + Biome monorepo scaffold and a repeatable review-first absorption workflow that incorporate only explicitly approved, reusable lessons from `~/xprojects/spur-new`.
## Scope
### Not yet specified

- The final absorption candidate matrix, including accept/reject/defer rationale, cannot be produced until the target and source audits are complete.
- Exact scaffold implementation slices and dependency ordering depend on the approved candidate matrix.
- Whether Bun workspace catalogs improve this template enough to justify adoption requires compatibility and maintenance evidence.
- Exact TypeScript, oRPC, Hono, React, Vite, and Zod upgrades remain undecided until compatibility research is complete.
- Any reusable runtime implementation discovered during review may graduate into `ts-libs-candidate` proposals, but extraction scope is not yet known.
- Commit boundaries and rollout sequencing will be derived after candidate approval and the generated-project verification matrix are available.

### Out of scope

- All `.spur/` configuration, rules, workflows, and harness integration changes.
- Spur product subsystems such as task management, workflow engines, observability, teams, schedulers, and job queues.
- Bulk synchronization of `spur-new` packages or dependency versions.
- Reshaping the locked monorepo app/package topology unless a separate evidence-backed ADR decision is approved.
- Changes to app, lib, or CLI scaffold modes except shared convergence infrastructure strictly required by this effort.
- Writing into `~/xprojects/ts-libs`; only classified proposals may be produced.
- `.github/workflows/` changes without separate explicit approval.
## Acceptance Criteria
```gherkin
Feature: Reviewed monorepo scaffold absorption

  @core
  Scenario: R1 Produce an approved implementation route
    Given the locked architecture, scope, safety, and modernization constraints
    When the wayfinder investigation frontier has been resolved
    Then the map identifies evidence-backed absorption candidates, rejected candidates, implementation slices, and verification gates

  @core
  Scenario: R2 Validate the hardened generated monorepo
    Given the operator has approved the absorption candidates
    When the approved changes are implemented in ts-base
    Then a freshly promoted monorepo passes the documented install, lint, typecheck, test, and build matrix

  @docs-only
  Scenario: AC1 [docs-only]: Every finding cites source evidence, and target comparisons cite target evidence where they affect disposition (R4).
    Given the source-pattern audit is linked to this feature
    When the audit evidence is evaluated
    Then every finding has specific source evidence and every target-dependent disposition has current target evidence

  @docs-only
  Scenario: AC2 [docs-only]: Every finding uses exactly one allowed classification: `reusable`, `monorepo-specific`, `project-specific`, `ts-libs-candidate`, or `rejected` (R3).
    Given the source-pattern audit findings
    When the classification matrix is evaluated
    Then each finding has exactly one classification from the locked vocabulary

  @docs-only
  Scenario: AC3 [docs-only]: The findings cover all R1 surfaces: manifests, workspace conventions, app/package boundaries, configuration, contracts, error handling, tests, and agent guidance.
    Given the source-pattern audit scope
    When surface coverage is evaluated
    Then every required engineering surface is represented by cited findings

  @docs-only
  Scenario: AC4 [docs-only]: Source product subsystems and harness behavior are excluded from adoption recommendations (R2).
    Given the locked absorption boundary
    When recommendations are evaluated
    Then product and harness behavior is not recommended for adoption

  @docs-only
  Scenario: AC5 [docs-only]: Already-adopted target capabilities are identified with target evidence and no redundant action.
    Given a source pattern already exists in the target
    When its disposition is evaluated
    Then the audit records it as already adopted and proposes no duplicate work

  @docs-only
  Scenario: AC1 [docs-only]: R1 — The mismatch between `--type code`, discovery, apply, and `absorb-code.md` is explained with `file:line` citations for each surface.
    Given the current convergence CLI and implementation
    When the advertised code flow is traced end to end
    Then each mismatched surface is explained with current file and line evidence

  @docs-only
  Scenario: AC2 [docs-only]: R2 — Candidate types, destinations, review fields, approval states, and idempotency behavior are proposed as a schema-level design.
    Given the review-only convergence boundary
    When the candidate and tracking models are designed
    Then types, destinations, fields, explicit states, and rescan behavior are fully specified

  @docs-only
  Scenario: AC3 [docs-only]: R3 — Source-boundary, sensitive-content, project-specific, and `ts-libs-candidate` protections are preserved; the design explicitly states none are weakened.
    Given the existing convergence safety classifications
    When code discovery is added to the design
    Then boundary checks, redaction, classification order, and apply blocking remain enforceable

  @docs-only
  Scenario: AC4 [docs-only]: R4 — An interface prototype (TypeScript signatures + JSON schema) is produced; no production implementation is written.
    Given the corrected design
    When its implementation surface is described
    Then TypeScript interfaces and a valid tracking JSON Schema are provided without runtime changes

  @docs-only
  Scenario: AC5 [docs-only]: The design is self-contained and actionable — a follow-up `code` template task can implement it without further design work.
    Given the interface, state, safety, and CLI decisions
    When a follow-up implementation task consumes this design
    Then no unresolved architectural choice remains
```
## Tasks

<!-- AUTO-GENERATED by spur feature refresh -->
| WBS | Task | Status |
| --- | ---- | ------ |
| 0020 | Audit the ts-base monorepo scaffold against its mode contract and generated behavior | Done |
| 0021 | Audit spur-new for reusable monorepo engineering patterns within the locked boundary | Done |
| 0022 | Design review-only code discovery and human-approved adaptation for convergence | done |
| 0023 | Define the Bun-only workspace orchestration contract for monorepo mode | done |
| 0024 | Establish the evidence baseline for selective dependency modernization | done |
| 0025 | Define the generated-monorepo verification matrix for absorbed changes | done |
| 0026 | Review the representative full-stack seams for minimal production-grade patterns | done |
| 0027 | Synthesize the approved monorepo absorption route from completed research | todo |
| 0028 | Implement the approved monorepo hardening route and validate a fresh generated project | todo |
<!-- END AUTO-GENERATED -->

## Notes
- Target: `~/xprojects/ts-base`; source: `~/xprojects/spur-new`.
- Generated-monorepo authority is `docs/00_ADR-mono.md`; `docs/00_ADR.md` governs `ts-base` itself.
- The current Turborepo decision is explicitly superseded: monorepo mode will use Bun workspaces directly. The dated ADR supersession and derived-document synchronization belong to the eventual implementation.
- Preserve the existing `apps/{server,web,cli}` and `packages/{api,config,db,utils}` boundaries by default.
- Keep the planet flow as a minimal executable example while making shared seams production-grade.
- Code absorption means automated discovery and evidence, explicit human approval, then surgical adaptation; never bulk-copy source trees.
- Dependency modernization is selective and evidence-backed, not a wholesale version sync.
- Preserve all pre-existing user changes in both repositories, including the modified source task file and untracked target context files.

### Decisions so far

_No investigation ticket has been resolved; the bullets above are operator-locked charting constraints._
## History
