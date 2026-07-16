---
template: meta
schema_version: 1
name: "Design review-only code discovery and human-approved adaptation for convergence"
description: ""
status: done
type: meta
profile: standard
feature_id: A
parent_wbs: null
priority: P0
tags: ["wayfinder:prototype", "convergence", "absorb-code", "security"]
dependencies: []
created_at: "2026-07-15T22:32:15.122Z"
updated_at: "2026-07-16T01:20:53.035Z"
---

## 0022. Design review-only code discovery and human-approved adaptation for convergence

### Background

Wayfinder type: prototype. Sharp question: What concrete convergence artifact and command flow can discover template/code candidates safely, preserve existing blocklists, and support approved hand-porting without enabling bulk code application?

### Requirements
R1. Explain the current mismatch between advertised `--type code`, discovery, apply, and `.claude/commands/absorb-code.md`.
R2. Propose candidate types, destinations, review fields, approval states, and idempotency behavior.
R3. Preserve source-boundary, sensitive-content, project-specific, and `ts-libs-candidate` protections.
R4. Produce a small interface prototype or schema-level design, not production implementation.
### Acceptance Criteria
```gherkin
Feature: Review-only convergence code discovery

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
### Q&A
**Q: Why keep `code` instead of removing it from the CLI?**
A: The locked convergence workflow calls for automated discovery and evidence followed by explicit human adaptation. Task 0021 found reusable *seams* (not ready-made library extractions), so a conservative shortlist remains useful. The CLI must describe it as review-only and require bounded source roots; it must not imply code can be applied.

**Q: Why is port state separate from the scan review?**
A: Scan artifacts are immutable evidence for one source snapshot; operator decisions have a different lifecycle. A separate tracking document preserves decisions across re-scans and avoids editing evidence that the scanner may regenerate.

**Q: Why keep a stable candidate ID and add `sourceDigest` instead of hashing content into the ID?**
A: The current ID is path-based (`scripts/agent-convergence/paths.ts:36-40`). Stable identity lets tracking follow the same conceptual candidate, while `sourceDigest` detects content drift. A digest mismatch yields an effective `needs-review` state without orphaning the prior decision.

**Q: Why does the review artifact omit source excerpts?**
A: Classification is heuristic and can miss sensitive or project-specific content. Persisting excerpts would turn a discovery miss into a data leak. Review artifacts carry relative path, digest, classification rationale, and a checklist only; humans open the source explicitly when evaluating a candidate.

**Q: Is reading a review an approval event?**
A: No. Every state change is explicit in the tracking document. `pending`, `approved`, `ported`, `rejected`, and `deferred` are operator decisions; no state changes merely because a report was rendered or read.
### Design
**Approach:** add a discriminated `review-only` code-candidate lane beside the existing copy-capable lane. Code discovery is opt-in through explicit relative roots, bounded and deterministic, and emits metadata-only evidence. It never creates a `ProposedChange`, never receives a writable destination, and cannot pass the apply type guard.

**Core invariants:**

1. Classification order is sensitive → project-specific → reusable-code → remaining rules; code never bypasses project-specific checks.
2. Serialized artifacts never contain discovered source content. Sensitive discoveries are represented only by an aggregate redaction count.
3. `review-only` candidates use `destinationPath: null` and are excluded from `proposedChanges`; the type system makes them ineligible for apply.
4. Candidate identity stays path-stable; `sourceDigest` detects drift and invalidates the effective approval state.
5. Scan evidence is immutable. Port decisions live only in a separate tracking document and are always explicit.
6. `ts-libs-candidate` remains blocked. The lane proposes hand adaptation; it never copies runtime implementation into `ts-base` or `ts-libs`.

**Tradeoffs:**

- Chosen: explicit-root, metadata-only review lane. It is safer and more actionable than broad repository crawling, at the cost of requiring the operator to name source roots.
- Rejected: remove `code`. This would discard the structured evidence lane required by the locked convergence workflow.
- Rejected: bulk or per-file code apply. It violates the hand-adaptation and `ts-libs-candidate` boundaries.
- Rejected: raw excerpts in review artifacts. Heuristic classification is not a sufficient confidentiality boundary.
- Rejected: content-derived candidate IDs. They make every edit look like a new candidate and strand durable decisions.

Result: a follow-up implementation task can add the lane without another architectural decision. The remaining implementation work is mechanical against the interfaces and state rules in Solution.
### Plan
1. [x] Verify the advertised `code` filter against discovery, classification, review, apply, destination, and command surfaces.
2. [x] Resolve the project-specific-classification ordering defect and sensitive-artifact risk.
3. [x] Define a discriminated copy/review-only candidate model and apply exclusion.
4. [x] Define bounded explicit-root discovery and deterministic ordering.
5. [x] Define stable candidate identity, source-digest drift detection, and explicit port states.
6. [x] Provide TypeScript interface prototypes and an actual JSON Schema for tracking.
7. [x] Define the `absorb-code.md` review-only branch and implementation file map.
8. [x] Verify R1-R4 and AC1-AC5 with current source references and repository gates.
### Solution
**R1 — Verified mismatch**

`code` is a valid type at the public/type layers but is a dead discovery lane and an intentionally blocked apply lane.

| Surface | Current evidence | Consequence |
| ------- | ---------------- | ----------- |
| CLI filter | `scripts/ts-base.ts:19-28,55-63,131-143` | `--type code` is accepted and advertised. |
| Candidate type | `scripts/agent-convergence/types.ts:4-8` | `code` exists in `CandidateKind` and filters. |
| Discovery | `scripts/agent-convergence/discovery.ts:151-162` | Only skills, commands, and configs are called; no code candidate can be emitted. |
| Classifier | `scripts/agent-convergence/classify.ts:60-67,82-103` | Any hypothetical `type === 'code'` is treated reusable before project-specific detection—a safety-ordering defect the new design must correct. |
| Apply | `scripts/agent-convergence/apply.ts:7-15,22-50` | `ts-libs-candidate` is blocked and `code` is outside the type allowlist; live reclassification reinforces the block. |
| Destination | `scripts/agent-convergence/paths.ts:22-34` | The fallback manufactures a markdown destination even though code is not copy-capable. |
| Review | `scripts/agent-convergence/review.ts:6-36,39-65` | Every candidate currently receives a proposed change; there is no review-only lane. |
| Post-apply command | `.claude/commands/absorb-code.md:6,20-38` | The command assumes apply wrote files and has no branch for review-only code evidence. |

The apply block is correct. The defect is the dishonest/incomplete discovery and review surface, plus a classifier ordering that would weaken project-specific protection if code discovery were added naïvely.

**R2 — Candidate, review, state, and idempotency model**

Use a discriminated union rather than optional fields that permit invalid combinations:

```ts
export type DiscoveryStrategy = 'copy' | 'review-only';
export type ExtractionTarget = 'ts-base' | 'ts-libs' | 'rejected';

interface CandidateBase {
    id: string;
    type: CandidateKind;
    sourcePath: string; // in-memory only; strip from serialized public artifacts if sensitive
    relativeSourcePath: string;
    classification: Classification;
    supportedModes: Mode[];
    rationale: string[];
    requiredConfirmation: true;
}

export interface CopyCandidate extends CandidateBase {
    type: 'skill' | 'command' | 'config';
    discoveryStrategy: 'copy';
    destinationPath: string;
}

export interface ReviewOnlyCodeCandidate extends CandidateBase {
    type: 'code';
    discoveryStrategy: 'review-only';
    destinationPath: null;
    sourceDigest: string; // SHA-256 of bytes read during discovery
    extractionTarget: ExtractionTarget;
    handPortChecklist: string[];
}

export type CapabilityCandidate = CopyCandidate | ReviewOnlyCodeCandidate;
```

Serialized review artifacts contain no `content` and render no source excerpt. Review-only rows contain: stable candidate ID, relative path, digest, classification, extraction target, rationale, supported modes, and hand-port checklist. Sensitive discoveries are omitted from candidate/blocked arrays and contribute only to `redactions.sensitiveCount`; project-specific candidates may appear as blocked metadata but never include content.

`ProposedChange` remains copy-only. `createReview()` filters by `discoveryStrategy === 'copy'` before calling `proposeChange()`. Review-only code candidates appear in a dedicated markdown table, with `Destination: N/A (hand adaptation)`.

**Explicit discovery scope and bounds**

```ts
export interface CodeDiscoveryOptions {
    /** Relative to sourceProject; each root must resolve inside it. */
    roots: string[];
    maxFileBytes: number; // default 262_144
    maxCandidates: number; // default 500
}

export interface ConvergenceScanOptions {
    // existing fields...
    code?: CodeDiscoveryOptions;
}
```

- `--type code` requires at least one repeatable `--code-root <relative-path>`; missing roots is an actionable error.
- `--type all` retains the current capability scan and includes code only when at least one `--code-root` is supplied. This prevents an unexpected repository-wide code crawl.
- Every root is passed through `resolveInside(sourceProject, root)` and every file through the existing realpath/symlink containment check (`scripts/agent-convergence/discovery.ts:38-43,83-84`).
- Only supported text extensions and files at or below `maxFileBytes` are read. Tests, generated output, dependencies, declarations, and source maps are excluded.
- Paths are collected, converted to POSIX form, sorted, then truncated at `maxCandidates`; output is deterministic across scans.
- Export presence is a shortlist signal, not proof of reusability. The classifier and human review remain authoritative.

**Approval and tracking states**

```ts
export type CodePortState = 'pending' | 'approved' | 'ported' | 'rejected' | 'deferred';

export interface CodePortEntry {
    sourceKey: string;
    candidateId: string;
    reviewedSourceDigest: string;
    state: CodePortState;
    targetRepository?: 'ts-base' | 'ts-libs';
    targetPath?: string; // repository-relative, never an absolute local path
    notes?: string;
    updatedAt: string;
}
```

No state is automatic. Rendering/reading a review leaves `pending` unchanged. Tracking keys are `(sourceKey, candidateId)`, where `sourceKey` is the package name or an explicit `--source-id`; this prevents collisions between repositories.

`candidateId` remains path-stable using `candidateId()` (`scripts/agent-convergence/paths.ts:36-40`). `sourceDigest` is separate. A re-scan with the same digest preserves the effective state. When the digest differs from `reviewedSourceDigest`, the report computes `needs-review` and does not treat `approved` or `ported` as current; the durable record is retained rather than orphaned.

The scan never overwrites the tracking document. A separate explicit decision command or manual CLI-gated implementation step owns tracking writes. Review JSON remains immutable evidence for that scan.

**R3 — Protection ordering and enforcement**

The current classifier checks sensitivity, then reusable code, then project markers (`scripts/agent-convergence/classify.ts:82-103`). That order is unsafe for a new code lane because `looksLikeReusableCode()` returns true for every code candidate (`classify.ts:60-63`). Correct order:

```ts
if (matchesSensitive(candidate)) return sensitive();
if (matchesProjectSpecific(candidate, context)) return projectSpecific();
if (candidate.type === 'code' && hasReusableSurface(candidate)) return tsLibsCandidate();
// existing outside-root, mode, generic, and unknown rules
```

| Protection | Corrected design |
| ---------- | ---------------- |
| Source boundary | Explicit roots and every discovered file resolve inside `sourceProject`; escaping roots and symlinks are rejected. |
| Sensitive content | Classification runs first; no sensitive path, ID, or content is serialized—only an aggregate count. Raw content stays in memory for classification. |
| Project-specific | Static and dynamic source markers run before reusable-code classification. These candidates remain blocked and metadata-only. |
| `ts-libs-candidate` | Remains in `BLOCKED_CLASSIFICATIONS` (`classify.ts:34-39`), uses `review-only`, and never receives a destination or `ProposedChange`. |
| Apply defense | `canApply()` first narrows to `CopyCandidate`; review-only code is rejected before classification/mode checks, and live reclassification remains intact. |

No existing protection is weakened; the ordering bug is explicitly part of the follow-up implementation contract.

**R4 — Interface prototype and tracking JSON Schema**

Implementation signatures:

```ts
export async function discoverCode(
    options: ConvergenceScanOptions & { code: CodeDiscoveryOptions },
): Promise<RawCandidate[]>;

export function isCopyCandidate(candidate: CapabilityCandidate): candidate is CopyCandidate;

export function effectiveCodePortState(
    candidate: ReviewOnlyCodeCandidate,
    entry: CodePortEntry | undefined,
): CodePortState | 'needs-review';

export function mergeCodeTracking(
    candidates: ReviewOnlyCodeCandidate[],
    tracking: CodePortTracking,
): CodePortTrackingView; // pure; does not mutate or persist tracking
```

Tracking document JSON Schema (Draft 2020-12):

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://gobing.ai/schemas/code-port-tracking.schema.json",
  "type": "object",
  "additionalProperties": false,
  "required": ["schemaVersion", "entries"],
  "properties": {
    "schemaVersion": { "const": 1 },
    "entries": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["sourceKey", "candidateId", "reviewedSourceDigest", "state", "updatedAt"],
        "properties": {
          "sourceKey": { "type": "string", "minLength": 1 },
          "candidateId": { "type": "string", "pattern": "^code:" },
          "reviewedSourceDigest": { "type": "string", "pattern": "^[a-f0-9]{64}$" },
          "state": { "enum": ["pending", "approved", "ported", "rejected", "deferred"] },
          "targetRepository": { "enum": ["ts-base", "ts-libs"] },
          "targetPath": { "type": "string", "minLength": 1, "not": { "pattern": "^(?:/|~|[A-Za-z]:[\\\\/])" } },
          "notes": { "type": "string" },
          "updatedAt": { "type": "string", "format": "date-time" }
        },
        "allOf": [
          {
            "if": { "properties": { "state": { "const": "ported" } }, "required": ["state"] },
            "then": { "required": ["targetRepository", "targetPath"] }
          }
        ]
      }
    }
  }
}
```

`absorb-code.md` gains a strategy branch: copy candidates follow the existing post-apply cleanup; review-only code candidates read the metadata table and tracking state, require an explicit decision, and hand-adapt one candidate at a time. It must state that `converge apply` wrote no code and must not use `git status` as evidence that code discovery succeeded (`.claude/commands/absorb-code.md:6,20-23`).

**Implementation map (not implemented here)**

| File | Mechanical follow-up |
| ---- | -------------------- |
| `scripts/agent-convergence/types.ts` | Add discriminated candidate union, code options, digest, tracking types, review redaction summary. |
| `scripts/agent-convergence/discovery.ts` | Add explicit-root bounded deterministic `discoverCode()`. |
| `scripts/agent-convergence/classify.ts` | Move project checks before reusable-code and remove the unconditional `type === 'code'` shortcut. |
| `scripts/agent-convergence/review.ts` | Exclude review-only candidates from proposed changes; render metadata only; aggregate sensitive redactions. |
| `scripts/agent-convergence/apply.ts` | Narrow to `CopyCandidate` before any apply path. |
| `scripts/agent-convergence/paths.ts` | Keep path-stable ID; stop manufacturing a destination for review-only code. |
| `scripts/ts-base.ts` | Parse repeatable `--code-root`, document `all` semantics, and emit actionable missing-root errors. |
| `.claude/commands/absorb-code.md` | Add the review-only decision/hand-adaptation branch. |
| `scripts/tests/agent-convergence/*.test.ts` | Cover containment, bounds, ordering, redaction, classifier precedence, apply rejection, digest staleness, and deterministic scans. |

No production implementation, workflow, CI, or source-project file is changed by task 0022.
### Testing
Coverage: N/A — documentation/schema design task; no runtime code path changed.

**Requirement verification**

| Requirement | Result | Evidence |
| ----------- | ------ | -------- |
| R1 | MET | Solution R1 maps the live CLI, type, discovery, classifier, apply, destination, review, and command surfaces with current `file:line` evidence; the fresh baseline scan emitted zero code candidates. |
| R2 | MET | Solution R2 defines a discriminated candidate model, review-only destination semantics, metadata fields, explicit states, bounded roots, and digest-based rescan behavior. |
| R3 | MET | Solution R3 corrects classifier precedence and specifies containment, redaction, project-specific blocking, `ts-libs-candidate` blocking, and type-level apply exclusion. |
| R4 | MET | Solution R4 provides TypeScript signatures and a parseable Draft 2020-12 JSON Schema; no runtime implementation file changed. |

**Acceptance-criteria verification**

| Criterion | Result | Evidence type | Evidence |
| --------- | ------ | ------------- | -------- |
| AC1 [docs-only] | MET | static-ref + command | Solution R1 cites all eight live surfaces; `converge scan --type code` exited 0 with zero candidates, blocked items, or proposed changes. |
| AC2 [docs-only] | MET | static-ref | Solution R2 specifies types, destinations, serialized fields, explicit states, and idempotency/drift behavior. |
| AC3 [docs-only] | MET | static-ref | Solution R3 specifies enforceable classification order, containment, redaction, blocklists, and apply rejection. |
| AC4 [docs-only] | MET | command + static-ref | Bun parsed the embedded schema and asserted Draft 2020-12/object/entries-array structure; the implementation map remains documentation-only. |
| AC5 [docs-only] | MET | manual-review | The corrected Design, settled tradeoffs, signatures, invariants, command semantics, and file map leave no unresolved architectural choice for implementation. |

**Fresh checks**

| Check | Result | Evidence |
| ----- | ------ | -------- |
| `spur task check 0022 --strict-core --json` | PASS | Exit 0; zero findings. |
| Live `--type code` baseline | PASS | Exit 0; `.spur/run/0022-code-final.json` contains 0 candidates, 0 blocked items, and 0 proposed changes, proving the advertised dead discovery lane. |
| Embedded tracking schema parse | PASS | Exit 0; Bun reported valid JSON with Draft 2020-12 object/entries-array structure. |
| `spur feature check A --json` | PASS | Exit 0; zero findings after tasks 0027 and 0028 charted the feature's synthesis and delivery scenarios. |
| `bun run lint` | PASS | Exit 0; Biome, root TypeScript, and scaffold TypeScript checks passed. |
| `bun run test` | PASS | Exit 0; 166 passed, 0 failed, 99.17% line and 99.82% function coverage. |
| `bun run --cwd src-monorepo build` | PASS | Exit 0; CLI, server, and web workspaces built successfully. |

**Design conformance**

| Claim | Status | Evidence |
| ----- | ------ | -------- |
| Review-only code lane | DONE | Discriminated union, null destination, and copy-only proposed changes are specified. |
| Preserve all protections | DONE | Corrected classifier order, metadata-only redaction, containment, and apply blocking are explicit. |
| Human hand adaptation | DONE | Tracking states are explicit and `absorb-code.md` branches away from apply. |
| Schema-level only | DONE | Only task/feature planning documentation and verification artifacts changed. |

**SECUA review**

- Security: MET — artifacts are metadata-only; sensitive discoveries produce only an aggregate redaction count.
- Efficiency: MET — roots, file size, candidate count, extensions, and deterministic ordering are bounded.
- Correctness: MET — the design matches path-stable IDs and fixes classifier precedence plus digest staleness.
- Usability: MET — missing roots are actionable, decisions are explicit, and review-only destinations are unambiguous.
- Architecture: MET — the type system separates evidence discovery from file application and preserves `ts-libs` ownership.

Review consistency: PASS — the review-owned section now matches the corrected design and reports no open blocker or major finding.

Verdict: PASS.
### Review
**Functional traceability**

| Requirement | Status | Evidence |
| ----------- | ------ | -------- |
| R1 | MET | `docs/tasks/0022_design-review-only-code-discovery-and-human-approved-adaptat.md:109` maps the advertised CLI/type surface through discovery, classification, review, destination, apply, and `absorb-code.md`, with live `file:line` citations. |
| R2 | MET | `docs/tasks/0022_design-review-only-code-discovery-and-human-approved-adaptat.md:126` defines the discriminated candidate model, null destination, metadata-only review fields, explicit states, stable IDs, source digests, and rescan behavior. |
| R3 | MET | `docs/tasks/0022_design-review-only-code-discovery-and-human-approved-adaptat.md:213` fixes classification precedence and preserves containment, redaction, project-specific blocking, `ts-libs-candidate` blocking, and apply exclusion. |
| R4 | MET | `docs/tasks/0022_design-review-only-code-discovery-and-human-approved-adaptat.md:234` provides TypeScript signatures plus a Draft 2020-12 tracking schema; line 311 confirms no production implementation was made. |

Functional Verdict: PASS.

**SECUA findings**

| Severity | Dimension | Evidence | Finding | Resolution | Status |
| -------- | --------- | -------- | ------- | ---------- | ------ |
| P2 | Correctness | `scripts/agent-convergence/classify.ts:60-67,82-103`; task Solution R3 | The original design would have allowed reusable-code detection to precede project-specific blocking. | Classify sensitive and project-specific material before reusable code; retain live reclassification at apply. | Resolved in design |
| P2 | Security | task Design invariants 1-3; Solution R2 | Source excerpts would enlarge the blast radius of a heuristic classification miss. | Serialize metadata only; omit sensitive candidates and expose only an aggregate redaction count. | Resolved in design |
| P2 | Correctness | `scripts/agent-convergence/paths.ts:36-40`; task Q&A and Solution R2 | Content-derived IDs would contradict the current path-stable identity and orphan durable decisions. | Keep the path-stable ID and use a separate SHA-256 `sourceDigest`; digest drift computes `needs-review`. | Resolved in design |
| P3 | Usability | task Solution R2 (`Explicit discovery scope and bounds`, `Approval and tracking states`) | Hardcoded roots and implicit review transitions would be incomplete and ambiguous. | Require repeatable `--code-root`; keep all decision states explicit and separate from report rendering. | Resolved in design |
| P3 | Architecture | task Design and implementation map | A generic candidate with optional fields could permit review-only code to enter apply. | Use a discriminated `CopyCandidate | ReviewOnlyCodeCandidate` union; code has `destinationPath: null` and no `ProposedChange`. | Resolved in design |

No open P1/P2 finding remains. The task adds no runtime dependency, credential surface, external input handler, or executable I/O path.

**Architecture depth**

| Signal | Result | Evidence |
| ------ | ------ | -------- |
| Shallow module | No candidate | Documentation-only task; no runtime module or pass-through wrapper was introduced. |
| Tight coupling | No candidate | Discovery evidence and application are separated by the candidate discriminant and explicit human decision state. |
| Wrong seam | No candidate | Review-only code stays outside `ProposedChange` and apply; reusable implementation remains a `ts-libs-candidate`, not copied into `ts-base`. |
| Weak locality | No candidate | Candidate, discovery, tracking, safety, command, and implementation responsibilities are mapped to their owning files. |
| Poor test surface | No candidate | The implementation map names pure state/digest logic and deterministic discovery tests without requiring a broad runtime stack. |

Architectural Verdict: PASS — no blocker, major, minor, or advisory deepening candidate remains in the documentation-only scope.

Review Verdict: PASS.
### References
- Task 0021: `docs/tasks/0021_audit-spur-new-for-reusable-monorepo-engineering-patterns-wi.md:20` — corrected source audit; reusable seams are adaptation candidates, not automatic `ts-libs` extractions.
- `scripts/agent-convergence/types.ts:4-77` — current candidate and scan option shapes.
- `scripts/agent-convergence/discovery.ts:38-43,65-162` — containment checks and current capability-only discovery.
- `scripts/agent-convergence/classify.ts:34-39,60-103` — blocklist and unsafe reusable-before-project classification order.
- `scripts/agent-convergence/apply.ts:7-15,22-50` — type allowlist and live reclassification.
- `scripts/agent-convergence/review.ts:6-65,72-123` — proposed-change generation and serialized review output.
- `scripts/agent-convergence/paths.ts:22-40` — fallback destination and path-stable candidate ID.
- `scripts/ts-base.ts:19-28,55-63,82-96,131-143` — public filter, scan route, and help text.
- `.claude/commands/absorb-code.md:6,20-38` — current post-apply-only assumption.
- `AGENTS.md` — review-first convergence and `ts-base` versus `ts-libs` ownership boundaries.
### History
- 2026-07-16T00:10:13.977Z todo → wip (system)
- 2026-07-16T00:11:11.623Z wip → testing (system)
- 2026-07-16T00:11:11.724Z testing → done (system)
