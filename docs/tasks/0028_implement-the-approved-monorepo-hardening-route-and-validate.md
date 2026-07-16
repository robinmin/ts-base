---
template: feature-impl
schema_version: 1
name: "Implement the approved monorepo hardening route and validate a fresh generated project"
description: ""
status: todo
type: task
profile: standard
feature_id: A
parent_wbs: null
priority: P2
tags: []
dependencies: []
created_at: "2026-07-16T01:17:29.800Z"
updated_at: "2026-07-16T01:18:43.385Z"
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

<!-- Filled during implementation: file:line change map and concise rationale. -->

### Testing

<!-- Filled during verification: commands run, outcomes, coverage claim or N/A. -->

### Review

<!-- Filled during review: P1-P4 findings, residual risk, and final disposition. -->

### References
- Task 0027 — approved absorption route and implementation-slice ordering.
- Task 0025 — generated-monorepo verification matrix.
- Feature A — locked scope, exclusions, and feature-level acceptance criteria.
- `docs/00_ADR-mono.md` — generated-monorepo decision authority.
- `docs/99_PROJECT_CONSTITUTION.md` — documentation synchronization rules.
### History
