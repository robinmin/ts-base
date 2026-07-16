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
updated_at: "2026-07-16T00:11:11.724Z"
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
- [x] AC1: R1 — The mismatch between `--type code`, discovery, apply, and `absorb-code.md` is explained with `file:line` citations for each surface.
- [x] AC2: R2 — Candidate types, destinations, review fields, approval states, and idempotency behavior are proposed as a schema-level design.
- [x] AC3: R3 — Source-boundary, sensitive-content, project-specific, and `ts-libs-candidate` protections are preserved; the design explicitly states none are weakened.
- [x] AC4: R4 — An interface prototype (TypeScript signatures + JSON schema) is produced; no production implementation is written.
- [x] AC5: The design is self-contained and actionable — a follow-up `code` template task can implement it without further design work.
### Q&A
**Q: Why not just remove `code` from `TYPE_FILTERS` and the CLI help text?**
A: Rejected. The convergence audit (task 0021) surfaced 3 `ts-libs-candidate` patterns (`resolveError`, `createId`, `apiSuccessSchema`/`apiErrorSchema`) and 1 reusable `EntityDao` base class. A structured review of code candidates has real value — the operator gets a markdown report with hand-port checklists instead of ad-hoc grepping. Removing the flag throws away this benefit to fix a UX lie.

**Q: Why track porting state in a separate JSON file instead of in the review artifact?**
A: Idempotency. Re-scanning the same source project overwrites the review JSON deterministically. If porting state lived in the review, it would be lost on re-scan. The `code-port-tracking.json` file is keyed by `candidateId` (stable across re-scans if the source is unchanged) and is never overwritten by the scan step.

**Q: Why is `extractionTarget` not a classification?**
A: Classification (`generic`, `mode-specific`, `ts-libs-candidate`, etc.) is a safety/ownership signal that drives apply/block decisions. `extractionTarget` is a recommendation for the human porting step. Conflating them would couple the safety guard to the porting workflow, which is an out-of-band human process.

**Q: Does this design enable bulk code application in the future?**
A: No. The `discoveryStrategy: 'review-only'` field and the `canApply()` guard make it explicit. A future task that wanted to enable bulk code application would need to (1) add `code` to the `canApply` type allowlist, (2) remove `ts-libs-candidate` from `BLOCKED_CLASSIFICATIONS` or introduce a new classification, and (3) change `destinationFor` for code. Three separate, visible changes — not a flag flip.
### Design
**Approach:** review-only discovery for `code` kind. Code candidates are discovered, classified, and surfaced in the review artifact with a hand-port checklist, but never enter the apply pipeline. This closes the dead-letter `--type code` gap without opening a bulk-code-application path.

**Tradeoffs:**
- *Chosen:* Review-only — safe, preserves all blocklists, matches the `ts-libs-candidate` extraction model. Cost: operator hand-ports manually.
- *Rejected:* Remove `code` from CLI — loses the structured review benefit. The convergence audit (0021) proved reusable code exists; surfacing it has value.
- *Rejected:* Full code apply — violates the `ts-libs-candidate` blocklist contract and the AGENTS.md rule that reusable runtime code goes to `ts-libs`, not `ts-base`.

**Key invariant:** `BLOCKED_CLASSIFICATIONS` still contains `ts-libs-candidate`; `canApply()` still rejects `code`. The new `discoveryStrategy: 'review-only'` field makes this invariant explicit rather than implicit.
### Plan
1. [x] Read convergence tooling source (`types.ts`, `discovery.ts`, `classify.ts`, `apply.ts`, `review.ts`, `paths.ts`, `ts-base.ts` CLI router) to map the `--type code` mismatch.
2. [x] Read `.claude/commands/absorb-code.md` to confirm the post-apply flow assumes code can be applied.
3. [x] Author `## Design` — approach, tradeoffs, rejected alternatives, key invariant.
4. [x] Author `## Solution` — R1 (mismatch with file:line evidence), R2 (types/destinations/fields/states/idempotency), R3 (preserved protections), R4 (interface prototype).
5. [x] Verify all four requirements answered; all five ACs met; no production code implemented (R4 constraint).
6. [x] Transition lifecycle: todo → wip → testing → done.
### Solution
#### R1 — Current mismatch between `--type code`, discovery, apply, and `absorb-code.md`

The `code` type is advertised in three places but never wired through the pipeline. The mismatch is a **dead-letter filter**: `--type code` is accepted, consumes a scan, produces zero candidates, and the apply step has no code path that could ever fire.

**Evidence (file:line):**

| Surface | What it advertises | What it does |
|---|---|---|
| `scripts/ts-base.ts:23` | `TYPE_FILTERS` set includes `'code'` | Accepts the flag at the CLI parser |
| `scripts/ts-base.ts:62` | Error message lists `code` as valid | Misleads the operator into thinking it works |
| `scripts/ts-base.ts:139` | Help text shows `--type <...|code>` | Documents a non-existent feature |
| `scripts/agent-convergence/types.ts:5` | `CandidateKind = 'skill' \| 'command' \| 'config' \| 'code'` | The `code` kind exists in the type union |
| `scripts/agent-convergence/discovery.ts:152-162` | `discoverCandidates()` calls `discoverSkills`, `discoverCommands`, `discoverConfigs` | **No `discoverCode()` exists.** `code` is never discovered. |
| `scripts/agent-convergence/classify.ts:60-67` | `looksLikeReusableCode()` checks `candidate.type === 'code'` → returns `true` | A code candidate, if it ever existed, would be classified `ts-libs-candidate` |
| `scripts/agent-convergence/classify.ts:35-39` | `BLOCKED_CLASSIFICATIONS` includes `ts-libs-candidate` | Even if discovered, code would be **blocked at apply** |
| `scripts/agent-convergence/apply.ts:14` | `canApply()` returns `true` only for `skill`, `command`, `config` | `code` is not in the allowlist → `canApply` returns `false` |
| `scripts/agent-convergence/paths.ts:23-34` | `destinationFor()` has no `code` branch → falls to default `docs/reviews/ts-libs-candidates/<name>.md` | Code would land as a markdown stub, not as runnable source |
| `.claude/commands/absorb-code.md:6` | "converge apply has just copied files from a source project into `.claude/skills/`, `.claude/commands/`, or other destination paths" | Implies code *can* be applied. It cannot. |

**Net effect:** `--type code` is a no-op that silently returns an empty candidate list, the review JSON has no code entries, and `absorb-code.md` step 1 (`git status -s`) would show nothing because apply never wrote anything. The operator's trust in the convergence tool is eroded by a flag that looks live but is dead.

**The mismatch is intentional at the apply layer (code is blocked by design — see R3) but accidental at the discovery and advertisement layer.** The task is to make the advertisement honest: either remove `code` from the CLI surface entirely, or wire a review-only discovery path that surfaces code candidates for human porting without enabling bulk application. This task chooses the latter — review-only discovery with human-approved hand-porting — because the convergence audit (task 0021) proved reusable code patterns exist in source projects and the operator benefits from a structured review of them.

#### R2 — Proposed candidate types, destinations, review fields, approval states, and idempotency

##### Candidate types

Keep the existing `CandidateKind` union (`skill | command | config | code`) unchanged. Add a new **discovery strategy** dimension that is orthogonal to kind:

```ts
// scripts/agent-convergence/types.ts (additive)
export type DiscoveryStrategy = 'copy' | 'review-only';
```

- `copy` (default, existing behavior): skill/command/config candidates are discovered, classified, and **bulk-appliable** after approval because they land in well-known directories (`.claude/skills/`, `.claude/commands/`, `.claude/imported-configs/`) with deterministic destinations.
- `review-only`: code candidates are discovered, classified, and written to a **review artifact only**. They are never passed to `applyApprovedCandidates()`. The operator hand-ports the reviewed pattern into `ts-libs` or `ts-base` manually.

The `code` kind is hard-wired to `review-only` in the discovery layer. No flag exposes this; it is invariant.

##### Destinations

Code candidates do not get a `destinationPath` in the target project. Instead, the review artifact itself is the destination:

| Kind | Strategy | Destination |
|---|---|---|
| `skill` | `copy` | `.claude/skills/<name>/SKILL.md` (existing) |
| `command` | `copy` | `.claude/commands/<name>.md` (existing) |
| `config` | `copy` | `.claude/imported-configs/<name>.md` (existing) |
| `code` | `review-only` | `docs/reviews/<review-id>/code-candidates/<relative-source-path>.md` |

The review markdown for code candidates renders the source excerpt, the classification rationale, the `ts-libs-candidate` recommendation, and a **hand-port checklist** — but never writes the raw source to the target tree.

##### Review fields

Extend `CapabilityCandidate` with optional review-only fields (additive, backward-compatible):

```ts
// scripts/agent-convergence/types.ts (additive)
export interface CapabilityCandidate {
    // ...existing fields...
    /** Present only when discoveryStrategy === 'review-only'. */
    discoveryStrategy?: DiscoveryStrategy;
    /** For code candidates: the recommended extraction target. */
    extractionTarget?: 'ts-libs' | 'ts-base' | 'rejected';
    /** For code candidates: a human-readable hand-port checklist. */
    handPortChecklist?: string[];
}
```

The `extractionTarget` field is populated by the classifier (R3) and defaults to `ts-libs` for any candidate that passes `looksLikeReusableCode()`. The `handPortChecklist` is rendered into the review markdown so the operator has a concrete to-do list per candidate.

##### Approval states

Code candidates do not participate in the `apply --approve <ids>` flow at all. Their "approval" is binary and out-of-band:

| State | Meaning | Transition |
|---|---|---|
| `reviewed` | Operator has read the review entry | Automatic when review is read |
| `ported` | Operator hand-ported the pattern into ts-libs/ts-base | Manual: operator edits the review JSON or marks in a tracking field |
| `rejected` | Operator decided not to port | Manual |
| `deferred` | Operator postponed | Manual |

Because these states are tracked **in the review artifact or an out-of-band tracking file** (not in the apply pipeline), there is no risk of accidental bulk application. The `apply` command continues to reject any `code` candidate ID if one is somehow passed to `--approve`.

##### Idempotency

- **Re-scanning the same source project** produces the same candidate IDs (ID is derived from `type + relativeSourcePath`, both stable). Re-running `converge scan --from <same> --type code` overwrites the prior review JSON deterministically.
- **Hand-port tracking** is idempotent: re-running scan does not reset `ported`/`rejected` states because those live in a separate `code-port-tracking.json` file keyed by candidate ID. If the source changes, the ID changes (different path or content hash suffix), and the old tracking entry is orphaned — which is correct because the source is no longer the same.
- **Apply idempotency is unaffected**: `code` candidates never enter apply, so the existing "re-classify from live source" guard in `apply.ts:38-50` is not bypassed or extended for code.

#### R3 — Preserved protections

All four existing blocklist and classification guards remain intact and are **strengthened** for code:

| Protection | Current behavior | Change for code discovery |
|---|---|---|
| **Source boundary** (`isSymlinkInside`, `resolveInside`) | Validates symlinks resolve inside source; destinations resolve inside target | Unchanged. Code discovery uses the same `resolvesInsideSource` check. |
| **Sensitive content** (`SENSITIVE_PATH_PATTERNS`, `SENSITIVE_CONTENT_PATTERNS`) | Blocks `.env`, credentials, private keys, API key patterns | Unchanged. Code candidates matching these are classified `sensitive` and **excluded from the review artifact entirely** — they are not even surfaced for review. |
| **Project-specific** (`PROJECT_SPECIFIC_PATTERNS` + `projectMarkers`) | Blocks org names, cloud accounts, deployment targets, absolute paths | Unchanged. Code with project-specific markers is classified `project-specific` and **excluded from the code review section**. |
| **`ts-libs-candidate`** (`looksLikeReusableCode` + `BLOCKED_CLASSIFICATIONS`) | Blocks code from apply, recommends extraction to ts-libs | **Preserved as the intended classification for code.** Code candidates that pass sensitive/project-specific checks are classified `ts-libs-candidate`, surfaced in the review with `extractionTarget: 'ts-libs'`, and **remain blocked at apply**. |

The key invariant: **`BLOCKED_CLASSIFICATIONS` still contains `ts-libs-candidate`, and `canApply()` still returns `false` for any candidate not of kind `skill`/`command`/`config`.** Code discovery adds a review surface; it does not open an apply path.

#### R4 — Interface prototype (schema-level, not production implementation)

##### Discovery: new `discoverCode()` function (prototype)

```ts
// scripts/agent-convergence/discovery.ts (prototype, not implemented)
const CODE_ROOTS = ['src', 'src-lib', 'src-app', 'src-cli', 'src-monorepo'];
const CODE_EXTENSIONS = /\.(?:ts|tsx|js|jsx|mjs|cjs)$/i;
const CODE_EXCLUDES = [
    /\.test\.tsx?$/i,        // tests are not extraction targets
    /\.spec\.tsx?$/i,
    /\/tests?\//i,
    /\/node_modules\//i,
    /\/dist\//i,
    /\/build\//i,
];

async function discoverCode(options: ConvergenceScanOptions, candidates: RawCandidate[]): Promise<void> {
    if (!includesType(options.typeFilter, 'code')) {
        return;
    }
    for (const root of CODE_ROOTS) {
        const codeRoot = join(options.sourceProject, root);
        if (!(await exists(codeRoot))) continue;
        for await (const relativePath of new Glob('**/*').scan({ cwd: codeRoot, onlyFiles: true })) {
            if (!CODE_EXTENSIONS.test(relativePath)) continue;
            if (CODE_EXCLUDES.some((re) => re.test(relativePath))) continue;
            const sourcePath = join(codeRoot, relativePath);
            if (!(await resolvesInsideSource(options.sourceProject, sourcePath))) continue;
            const content = await safeReadText(sourcePath);
            // Only surface files with export statements (reusable surface)
            if (!REUSABLE_CODE_PATTERNS.some((re) => re.test(content))) continue;
            await addCandidate(candidates, options, 'code', sourcePath, relativePath, content);
        }
    }
}
```

Add `await discoverCode(normalizedOptions, candidates);` to `discoverCandidates()` at `discovery.ts:159`.

##### Classifier: extend `classifyCandidate` for code (prototype)

```ts
// classifyCandidate() — add code-specific fields (prototype)
if (candidate.type === 'code') {
    return {
        ...baseCandidate,
        classification: result.classification, // 'ts-libs-candidate' if reusable
        discoveryStrategy: 'review-only',
        extractionTarget: result.classification === 'ts-libs-candidate' ? 'ts-libs' : 'rejected',
        handPortChecklist: buildHandPortChecklist(candidate),
    };
}
```

##### Review: render code candidates in a separate section (prototype)

```ts
// review.ts renderReview() — add a "Code Candidates (review-only)" section
const codeCandidates = review.candidates.filter((c) => c.type === 'code');
if (codeCandidates.length > 0) {
    lines.push('## Code Candidates (review-only, not auto-applied)');
    for (const c of codeCandidates) {
        lines.push(`### ${c.id}`);
        lines.push(`- Source: \`${c.relativeSourcePath}\``);
        lines.push(`- Classification: ${c.classification}`);
        lines.push(`- Extraction target: ${c.extractionTarget}`);
        lines.push(`- Rationale: ${c.rationale.join('; ')}`);
        if (c.handPortChecklist?.length) {
            lines.push('- Hand-port checklist:');
            for (const item of c.handPortChecklist) lines.push(`  - [ ] ${item}`);
        }
    }
}
```

##### Apply: harden the guard (prototype, one-line)

```ts
// apply.ts canApply() — make the code exclusion explicit (currently implicit via type allowlist)
function canApply(candidate: CapabilityCandidate, review: CapabilityReview): boolean {
    if (candidate.discoveryStrategy === 'review-only') return false; // explicit
    // ...existing checks...
}
```

This makes the invariant self-documenting: even if a future change adds `code` to the type allowlist, the `review-only` strategy still blocks apply.

##### `absorb-code.md` correction

Update step 1 of `.claude/commands/absorb-code.md` to clarify that code candidates are review-only:

> If the review artifact contains code candidates (type `code`), they were **not** applied by `converge apply`. They are surfaced for human hand-porting to `ts-libs` or `ts-base`. Check the "Code Candidates (review-only)" section of the review markdown for the hand-port checklist. Do not attempt to bulk-apply code.

##### Idempotency tracking file (prototype schema)

```json
// docs/reviews/<review-id>/code-port-tracking.json
{
  "reviewId": "agent-convergence-2026-07-15T...",
  "entries": [
    {
      "candidateId": "code:src-lib:utils:resolve-error.ts",
      "state": "ported",
      "portedTo": "~/xprojects/ts-libs/packages/error-resolver/src/index.ts",
      "portedAt": "2026-07-15T23:00:00Z",
      "notes": "Adapted resolveError() — dropped Spur-specific onError handler."
    }
  ]
}
```

This file is the only mutation target for code approval states. It is keyed by `candidateId` for idempotency. Re-scanning overwrites the review JSON but **never** overwrites this tracking file — the operator's porting decisions persist.

#### Summary of changes (not implemented — this is a design task)

| File | Change | Layer |
|---|---|---|
| `scripts/agent-convergence/discovery.ts` | Add `discoverCode()` + call in `discoverCandidates()` | Discovery |
| `scripts/agent-convergence/types.ts` | Add `DiscoveryStrategy`, extend `CapabilityCandidate` with optional fields | Types |
| `scripts/agent-convergence/classify.ts` | Populate `discoveryStrategy`, `extractionTarget`, `handPortChecklist` for code | Classification |
| `scripts/agent-convergence/review.ts` | Render "Code Candidates (review-only)" section in markdown | Review |
| `scripts/agent-convergence/apply.ts` | Add explicit `review-only` guard in `canApply()` | Apply (harden) |
| `scripts/ts-base.ts:62,139` | Keep `code` in CLI surface (now honest) | CLI |
| `.claude/commands/absorb-code.md` | Correct step 1 to explain code is review-only | Docs |

**No production implementation is produced.** This is the schema-level design and interface prototype required by R4. Implementation is deferred to a follow-up `code` template task.
### Testing
This is a `meta` template design task. No production code was implemented, so no automated tests apply.

**Verification performed:**
- Read all convergence module source files to confirm the mismatch evidence is accurate to the current codebase state (2026-07-15, HEAD `87c7a86`).
- Confirmed `discoverCandidates()` at `discovery.ts:152-162` has no `discoverCode()` call.
- Confirmed `canApply()` at `apply.ts:7-15` excludes `code` from the type allowlist.
- Confirmed `BLOCKED_CLASSIFICATIONS` at `classify.ts:35-39` includes `ts-libs-candidate`.
- Confirmed `destinationFor()` at `paths.ts:23-34` has no `code` branch.
- Confirmed `.claude/commands/absorb-code.md:6` implies code can be applied.

**Coverage claim:** N/A — design/schema task, no code to test.
### Review
**Functional traceability**

| Requirement | Status | Evidence |
| ----------- | ------ | -------- |
| R1 | MET | The mismatch table in Solution R1 cites `scripts/ts-base.ts:23,62,139`, `scripts/agent-convergence/types.ts:5`, `discovery.ts:152-162`, `classify.ts:35-39,60-67`, `apply.ts:7-15`, `paths.ts:23-34`, and `.claude/commands/absorb-code.md:6` — eight surfaces with file:line evidence. |
| R2 | MET | Solution R2 proposes `DiscoveryStrategy` type, review-only destinations, extended `CapabilityCandidate` fields, four approval states (`reviewed`/`ported`/`rejected`/`deferred`), and idempotency via stable candidate IDs + separate tracking JSON. |
| R3 | MET | Solution R3 documents all four protections (source-boundary, sensitive-content, project-specific, `ts-libs-candidate`) as preserved, with the key invariant that `BLOCKED_CLASSIFICATIONS` still contains `ts-libs-candidate` and `canApply()` still rejects `code`. |
| R4 | MET | Solution R4 provides TypeScript interface prototypes for `discoverCode()`, classifier extension, review rendering, apply hardening, and a JSON schema for the tracking file. No production code is implemented. |

Functional Verdict: PASS.

**SECUA findings**

| Severity | Dimension | Evidence | Finding | Resolution |
| -------- | --------- | -------- | ------- | ---------- |
| P2 | Architecture | `scripts/agent-convergence/apply.ts:7-15`; proposed `discoveryStrategy` field | The `review-only` guard is belt-and-suspenders; the primary gate remains the type allowlist in `canApply()`. | Accepted: documented in Solution R2. The primary gate is the existing type allowlist; `review-only` makes the invariant explicit. |
| P3 | Maintainability | proposed `CODE_ROOTS` array | Hardcoded source roots (`src`, `src-lib`, etc.) will miss non-standard layouts. | Accepted for prototype; flagged for implementation task to make configurable via `ConvergenceScanOptions`. |
| P4 | Docs | `.claude/commands/absorb-code.md:6` | Step 1 correction is described but not applied (design task, not implementation). | Accepted: the follow-up `code` template task must apply the correction. |

No open blocker or major SECUA finding remains. Security is N/A — this task introduces no runtime path, dependency, secret, input boundary, or I/O behavior; it is a schema-level design only.

**Architecture depth**

- Shallow module: no runtime module was added or changed.
- Tight coupling / wrong seam: the design explicitly preserves the `ts-libs-candidate` blocklist and the `canApply()` type allowlist; no new seam is introduced between convergence and apply.
- Weak locality: each proposed change is co-located with its file:line evidence in the Solution summary table.
- Poor test surface: N/A for a design-only artifact; verification was reading the convergence source to confirm evidence accuracy.
### References
- Task 0021: `docs/tasks/0021_audit-spur-new-for-reusable-monorepo-engineering-pattern.md` — convergence audit that classified 3 `ts-libs-candidate` code patterns and 1 `EntityDao` base class.
- Task 0023: `docs/tasks/0023_define-the-bun-only-workspace-orchestration-contract-for-mon.md` — ADR-006 supersession (Bun-native `--filter` replaces Turbo).
- `scripts/agent-convergence/types.ts` — `CandidateKind`, `Classification`, `CapabilityCandidate` type definitions.
- `scripts/agent-convergence/discovery.ts:152-162` — `discoverCandidates()` entry point (no `discoverCode` call).
- `scripts/agent-convergence/classify.ts:35-39,60-67` — `BLOCKED_CLASSIFICATIONS`, `looksLikeReusableCode()`.
- `scripts/agent-convergence/apply.ts:7-15` — `canApply()` type allowlist.
- `scripts/agent-convergence/paths.ts:23-34` — `destinationFor()` (no `code` branch).
- `scripts/ts-base.ts:19-28,55-63,138-139` — CLI `TYPE_FILTERS`, `parseTypeFilter()`, help text advertising `code`.
- `.claude/commands/absorb-code.md:6` — post-apply command implying code can be applied.
- `AGENTS.md` — "ts-base vs ts-libs" boundary rule: reusable runtime code goes to `ts-libs`, not `ts-base`.
### History
- 2026-07-16T00:10:13.977Z todo → wip (system)
- 2026-07-16T00:11:11.623Z wip → testing (system)
- 2026-07-16T00:11:11.724Z testing → done (system)
