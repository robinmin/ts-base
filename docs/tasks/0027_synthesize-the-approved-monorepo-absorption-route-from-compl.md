---
template: meta
schema_version: 1
name: "Synthesize the approved monorepo absorption route from completed research"
description: ""
status: todo
type: meta
profile: standard
feature_id: A
parent_wbs: null
priority: P2
tags: ["meta"]
dependencies: []
created_at: "2026-07-16T01:17:27.228Z"
updated_at: "2026-07-16T01:18:27.059Z"
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
1. [ ] Read the final Solution/Testing/Review evidence from tasks 0020-0026.
2. [ ] Build the accept/reject/defer matrix and resolve duplicate or conflicting recommendations against the authoritative docs.
3. [ ] Group accepted candidates into minimal ordered implementation slices and map each slice to files, docs, and verification gates.
4. [ ] Present the route for explicit operator approval and record the decision without implementing it.
5. [ ] Run strict task and Feature A traceability checks.
### Solution

<!-- Filled during implementation: changed files/sections and concise rationale. -->

### Testing

<!-- Filled during verification: commands/checks run, outcomes, coverage claim or N/A. -->

### Review

<!-- Filled during review: P1-P4 findings, residual risk, and final disposition. -->

### References
- Feature A — locked scope and feature-level acceptance criteria.
- Tasks 0020-0026 — completed investigation and design evidence.
- `docs/00_ADR-mono.md` — generated-monorepo decision authority.
- `docs/99_PROJECT_CONSTITUTION.md` — documentation synchronization rules.
### History
