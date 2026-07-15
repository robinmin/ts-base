---
template: review
schema_version: 1
name: "Audit the ts-base monorepo scaffold against its mode contract and generated behavior"
description: ""
status: todo
type: review
profile: standard
feature_id: A
parent_wbs: null
priority: P0
tags: ["wayfinder:research", "monorepo", "review", "target-audit"]
dependencies: []
created_at: "2026-07-15T22:32:15.118Z"
updated_at: "2026-07-15T22:32:15.120Z"
---

## 0020. Audit the ts-base monorepo scaffold against its mode contract and generated behavior

### Background

Wayfinder type: research. Sharp question: Which correctness, architecture, security, maintainability, test, documentation, and setup defects currently prevent `AGENTS-mono.md` plus `src-monorepo/` from being a solid generated-project baseline?

#### Review Findings

The code-review findings this task must address — logged here as **input** (what was found
in the reviewed PR/commit/diff). Fix in priority order (P1 → P2 → …); re-review after.

| Severity | File | Finding | Recommendation |
| -------- | ---- | ------- | -------------- |
| P1       |      |         |                |
| P2       |      |         |                |

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

<!-- Filled during implementation: file:line change map and concise rationale. -->

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

<!-- Links to source review, dogfood report, PR/diff, related tasks, or external references. -->

### History
