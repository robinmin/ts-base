---
name: "Project direction docs and agent capability convergence importer"
description: "Project direction docs and agent capability convergence importer"
status: Done
created_at: 2026-06-10T19:00:06Z
updated_at: 2026-06-11T23:14:25.911Z
folder: docs/tasks
type: task
feature-id: ""
priority: high
estimated_hours: 8
tags: ["agent-tools","template","setup","skills","commands","convergence"]
impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: completed
  testing: completed
---

## 0018. Project direction docs and agent capability convergence importer

### Background

`ts-base` is changing direction from a static Bun + TypeScript + Biome starter into a template and tooling project that helps developers create new projects quickly while preserving hard-won project experience and best practices.

Because this task changes the project direction, the first implementation priority is to update the project-level documents that future agents and developers will read before touching code. Without that documentation reset, later implementation work will keep interpreting the repository as only a starter template and will drift.

The divergence side is mostly done: `scripts/setup.ts` can generate a chosen project shape from app, lib, cli, or mono scaffolds, remove unused modes, wire mode-specific scripts, and keep a mode-specific `AGENTS.md`/ADR contract. The remaining convergence work is to absorb reusable agent-facing capabilities from specified source projects into this template without importing project-specific drift.

The target capability surface is:

- Claude Code remains the primary authoring source of truth:
  - `.claude/skills/<skill-name>/SKILL.md`
  - `.claude/commands/<command-name>.md`
- Other coding agents consume the same canonical content through symlinks or thin adapters:
  - `.agents/skills -> .claude/skills` already exists locally and `scripts/setup.ts` recreates it after setup when `.claude/skills` exists.
  - Codex and similar tools should be enabled through repository-local links/adapters, not duplicated copies that can drift.
- Imported capabilities must be filtered so only fundamental workflow, command, and agent-operation knowledge enters the template. Project-specific names, secrets, deployment assumptions, service endpoints, business logic, and one-off workflow decisions must be rejected or rewritten only after explicit user confirmation.

This task exists to design and implement a guarded importer/enhancer workflow. The key non-negotiable is confirmation: every import, rewrite, enhancement, or config addition must be proposed as a reviewable plan and applied only after the end user explicitly accepts it.

Two existing assets must shape the design:

- **Spur** is the quality harness used across Robin's projects to help AI agents deliver production-quality software. This project should integrate with Spur as a first-class verification and workflow partner, not treat it as an incidental check.
- **ts-libs** is the reusable TypeScript library collection at `~/xprojects/ts-libs`. When convergence discovers reusable components or utilities inside source projects, the importer workflow must decide whether they belong in this template or should be proposed for extraction into `ts-libs`.

### Requirements

- [x] **R1** — Update the top-priority project direction files → **MET** | `AGENTS.md`, `README.md`, `docs/00_ADR.md`, `docs/01_PRD.md`, `docs/03_ARCHITECTURE.md`
- [x] **R2** — Docs define divergence, convergence, confirmation gates, Spur, `ts-libs` boundary → **MET** | README + ADR-001..003 + PRD + ARCHITECTURE
- [x] **R3** — Source-of-truth layout (`.claude/skills/<name>/SKILL.md`, `.claude/commands/<name>.md`) → **MET** | ADR-002; `paths.ts` `destinationFor()`
- [x] **R4** — Repository boundary rule: `ts-base` vs `ts-libs`, `ts-libs-candidate` classification → **MET** | `AGENTS.md` boundary; `classify.ts` routes to `ts-libs-candidate`; `apply.ts` blocks
- [x] **R5** — Spur preserved, documented, no leakage into generated projects → **MET** | `package.json` scripts; PRD non-goal; README
- [x] **R6** — Cross-agent: `.claude/*` canonical, `.agents/skills` symlink → **MET** | ADR-002; `capabilities.ts` `wireAgentSkillsSymlink()` with idempotent/replace/refuse semantics; `setup.ts` calls it
- [x] **R7** — Convergence workflow: source path, mode, type, dry-run → **MET** | `ts-base.ts` `converge scan --from --mode [--type]`
- [x] **R8** — One CLI entrypoint with subcommands → **MET** | `scripts/ts-base.ts` routing `converge scan|review|apply`
- [x] **R9** — Discovery inspects `.claude/skills`, `.claude/commands`, `.agents/skills`, `.codex`, agent configs → **MET** | `discovery.ts`; `.agents` dedup by content
- [x] **R10** — Classification: generic / mode-specific / ts-libs-candidate / project-specific / sensitive / unknown → **MET** | `types.ts` `Classification`; all six classes tested
- [x] **R11** — Filtering catches org names, paths, package names, cloud targets, reusable code, outside-root mutations → **MET** | Project marker heuristics + source `package.json` name + code-extension check + `OUTSIDE_ROOT_MUTATION_PATTERNS`
- [x] **R12** — Review artifact before write: inventory, classification, rationale, destinations, risks, open questions → **MET** | `review.ts` `createReview()` — candidates, *actions, *blocked, *risks, *openQuestions*
- [x] **R13** — Explicit confirmation for every skill, command, config, symlink/adapter → **MET** | apply writes only `--approve` candidates
- [x] **R14** — Idempotency: no duplicates, existing diffed, conflicts at review → **MET** | deterministic paths; idempotent-write test; `createReview` diffs → `update`/`skip`
- [x] **R15** — Mode handling: annotation + setup-time pruning → **MET** | `annotateSupportedModes()` in apply; `pruneModeScopedCapabilities()` in setup; app-mode smoke test confirms
- [x] **R16** — Tests: discovery, classification, dry-run, gating, idempotency, symlink behavior, mode filtering → **MET** | 70 tests: all categories + symlink wiring/escape/refusal/annotation/pruning covered
- [x] **R17** — Docs explain canonical `.claude`, symlink/adaptor, CLI, Spur, ownership, dry-run/review/approve, out-of-scope → **MET** | README + ARCHITECTURE + AGENTS.md all updated with mode annotation contract


### Q&A

- **Q: Should this importer automatically absorb everything from a source project if it looks useful?**
  **A:** No. Default behavior is dry-run review. Applying changes requires explicit confirmation.

- **Q: Should `.claude` and `.agents` both store full copies of skills?**
  **A:** No. `.claude` is canonical. `.agents/skills` should remain a symlink or generated adapter target to avoid drift.

- **Q: Should project-specific material be deleted from source content automatically?**
  **A:** No. Project-specific material should be rejected or proposed as a rewrite. Rewrites require user approval and must be visible in the review artifact.

- **Q: Should this run during `bun run setup`?**
  **A:** Not by default. Setup can preserve or prune already-approved capabilities for the selected mode, but importing from an external source project is a separate explicit command/workflow.

- **Q: Should reusable utilities discovered in source projects be imported into `ts-base`?**
  **A:** Usually no. If the utility is reusable beyond template orchestration or agent tooling, classify it as a `ts-libs-candidate` and propose extraction into `~/xprojects/ts-libs` after team confirmation.

- **Q: Should new convergence tooling be added as separate scripts?**
  **A:** No. New tooling should use one CLI entrypoint with subcommands. Consolidating existing scripts can be considered after this task, but it is not current scope.

- **Q: Should Spur be bundled into every generated project by default?**
  **A:** Not decided by this task. This task must document and preserve Spur as the quality harness for this repository, and any propagation into generated projects must be explicit and confirmed.

### Design

#### Brainstormed approaches

##### Approach 1: Project-direction docs + canonical `.claude` source + guarded importer CLI (recommended)

First update the project-level documents so the repository's new direction is unambiguous. Then create a Bun/TypeScript CLI entrypoint with convergence subcommands that perform discovery, classification, review artifact generation, and approved application. `.claude/skills` and `.claude/commands` are the only canonical authoring locations. Other agents use symlinks or generated thin adapters.

Pros:

- Resets the repository contract before adding new tooling, reducing later agent confusion.
- Strongest drift control because there is one content source.
- Fits the repo's existing Bun script pattern and setup-time symlink behavior.
- Easy to test with fixture projects and snapshot-like review reports.
- Confirmation gating can be enforced centrally.
- Gives a natural place to encode Spur and `ts-libs` ownership rules.

Cons:

- More initial implementation than manual copying because docs and tooling both need updates.
- Classification heuristics will need iterative hardening.
- Some target agents may need adapter generation if they cannot consume Claude-style content directly.

Confidence: HIGH, based on local repo inspection of `.claude/*`, `.agents/skills`, and existing setup symlink logic in `scripts/setup.ts`.

##### Approach 2: Manual review checklist + static folder conventions

Document a folder structure and require maintainers to manually copy accepted skills/commands into `.claude`, then manually create symlinks for other tools.

Pros:

- Fastest implementation.
- Low tooling complexity.
- Useful as a baseline process before automation.

Cons:

- High long-term drift risk.
- Easy to bypass confirmation accidentally.
- Weak repeatability across projects and modes.
- Harder to verify with tests.

Confidence: MEDIUM. It is viable for one-off work but weak for a reusable template.

##### Approach 3: Full agent-capability package manager

Create a richer registry-like system with manifests, versioning, mode compatibility, generated adapters, approvals, and upgrade/diff workflows.

Pros:

- Best long-term capability management if many projects will feed this template.
- Supports versioned skills/commands and controlled upgrades.
- Can model cross-agent adapters cleanly.

Cons:

- Too heavy for the immediate convergence need.
- Higher risk of over-engineering before import patterns are proven.
- More surface area to test and maintain.

Confidence: MEDIUM. Architecturally clean, but the timing is premature.

#### Recommendation

Implement Approach 1, but keep the design compatible with Approach 3 later:

- Update `AGENTS.md`, `README.md`, `docs/00_ADR.md`, `docs/01_PRD.md`, and `docs/03_ARCHITECTURE.md` as the top-priority work.
- Start with a script-level importer and a simple review artifact.
- Use one CLI entrypoint with subcommands instead of adding more one-off scripts.
- Represent candidate metadata in structured TypeScript types.
- Keep adapter generation behind a small interface.
- Treat Spur and `ts-libs` as explicit architectural dependencies/boundaries.
- Avoid registry/versioning until repeated imports show a real need.

#### Proposed workflow

1. User runs a dry-run import command with source path and mode.
2. Script discovers candidate skills, commands, and optional configs.
3. Script classifies candidates using deterministic heuristics, including `ts-libs-candidate` when reusable code belongs outside this template.
4. Script writes a review artifact under `docs/reviews/` or prints JSON/Markdown for review.
5. User explicitly approves selected candidates.
6. Script applies only approved changes:
   - Create/update `.claude/skills/<name>/SKILL.md`.
   - Create/update `.claude/commands/<name>.md`.
   - Create/refresh symlinks/adapters.
7. Script reports final changed files and verification commands.

#### Proposed command shape

```bash
bun run scripts/ts-base.ts converge scan --from ../source-project --mode app --type all
bun run scripts/ts-base.ts converge apply --review docs/reviews/<review-id>.json --approve candidate-id-1,candidate-id-2
```

The exact entrypoint name can change during implementation, but the interface must preserve:

- Explicit source path.
- Explicit target mode.
- Dry-run default.
- Separate approval/apply step.
- One entrypoint with subcommands.

#### Review artifact shape

```ts
interface CapabilityReview {
    sourceProject: string;
    targetMode: 'app' | 'lib' | 'cli' | 'mono';
    createdAt: string;
    candidates: CapabilityCandidate[];
    proposedChanges: ProposedChange[];
    blocked: BlockedCandidate[];
}

interface CapabilityCandidate {
    id: string;
    type: 'skill' | 'command' | 'config';
    sourcePath: string;
    destinationPath: string;
    classification: 'generic' | 'mode-specific' | 'ts-libs-candidate' | 'project-specific' | 'sensitive' | 'unknown';
    supportedModes: Array<'app' | 'lib' | 'cli' | 'mono'>;
    rationale: string[];
    requiredConfirmation: true;
}
```

### Solution

Implementation should use one CLI entrypoint with small, testable modules behind it:

```text
scripts/
  ts-base.ts                            # CLI entrypoint with subcommands
  agent-convergence/
    discovery.ts                        # source project scanning
    classify.ts                         # generic/project/sensitive/mode-specific logic
    review.ts                           # markdown/json review artifact generation
    apply.ts                            # confirmed writes + symlink/adaptor handling
    paths.ts                            # canonical destination rules
    types.ts                            # shared types
```

Initial subcommand shape:

```text
ts-base converge scan   # discover + classify + write review artifact; dry-run default
ts-base converge review # render/summarize an existing review artifact
ts-base converge apply  # apply only explicitly approved candidate IDs
```

Project documentation changes should be treated as the first implementation slice:

```text
AGENTS.md                # operating contract for the new direction
README.md                # product positioning and workflows
docs/00_ADR.md           # architectural decisions
docs/01_PRD.md           # product brief and direction
docs/03_ARCHITECTURE.md  # architecture overview
```

Suggested tests:

```text
scripts/tests/
  agent-convergence.discovery.test.ts
  agent-convergence.classify.test.ts
  agent-convergence.review.test.ts
  agent-convergence.apply.test.ts
  ts-base-cli.test.ts
  fixtures/agent-source-project/
```

Implementation notes:

- Use Bun file APIs and TypeScript only; do not add a new runtime or package manager.
- Prefer structured path operations and explicit allowlists over regex-only filtering.
- Never follow symlinks from the source project into arbitrary external directories unless explicitly allowed.
- Do not inspect or import files matching secret-sensitive names (`.env*`, credentials, token/key files).
- Classify reusable code as `ts-libs-candidate` unless it is clearly template orchestration or agent tooling.
- Do not write to `~/xprojects/ts-libs` from this task. Produce a proposal only; extraction requires a separate confirmed task.
- Keep Spur integration explicit: document how existing `spur-check` scripts fit, but do not add Spur internals to generated projects without confirmation.
- Use a stable review artifact format so future automation can approve selected candidate IDs.
- Preserve existing Biome style and strict TypeScript constraints.

Implemented as specified:

- Project direction docs were updated/created:
  - `AGENTS.md`
  - `README.md`
  - `docs/00_ADR.md`
  - `docs/01_PRD.md`
  - `docs/03_ARCHITECTURE.md`
- One CLI entrypoint was added at `scripts/ts-base.ts`.
- Convergence modules were added under `scripts/agent-convergence/`.
- Tests were added under `scripts/tests/`.
- Local Spur rules were adjusted so this repo's `recommended` preset uses explicit local TypeScript rule files and avoids broken global rg-evaluator behavior.

### Plan

- [x] Update the project direction docs:
  - [x] `AGENTS.md`
  - [x] `README.md`
  - [x] `docs/00_ADR.md`
  - [x] `docs/01_PRD.md`
  - [x] `docs/03_ARCHITECTURE.md`
- [x] Inspect existing setup/symlink behavior and decide whether to keep or adjust `.agents/skills` wiring.
- [x] Inspect `~/xprojects/ts-libs` enough to document the boundary rule and avoid duplicating reusable libraries in `ts-base`.
- [x] Define TypeScript types for candidates, classifications, review artifacts, and proposed changes.
- [x] Create the single CLI entrypoint and `converge` subcommand structure.
- [x] Implement discovery for `.claude/skills`, `.claude/commands`, `.agents/skills`, and selected agent config files.
- [x] Implement safe path handling:
  - [x] Source path can be outside the target repo, because source projects are explicit inputs.
  - [x] Destination paths stay under the project root.
  - [x] Symlinks that escape source project boundaries are skipped during discovery.
- [x] Implement classification heuristics and blocklist rules, including `ts-libs-candidate`.
- [x] Implement dry-run review generation.
- [x] Implement approval/apply mode using selected candidate IDs from a review artifact.
- [x] Implement canonical writes to `.claude/*`.
- [x] Implement symlink/adaptor handling for `.agents/skills` discovery; no new adapter destinations were added.
- [x] Add fixture-based tests for discovery, classification, review, apply, idempotency, and mode filtering.
- [x] Update README and architecture docs with dry-run and approval workflow.
- [x] Run verification:
  - [x] `bun run lint`
  - [x] `bun run test`
  - [x] `bun run spur-check`
  - [x] `git status --short`

### Review

Implementation review (2026-06-10, Codex) — original findings:

- Confirmation gating is enforced by `converge apply --approve <ids>`; scan/review do not apply writes.
- Sensitive, project-specific, and `ts-libs-candidate` candidates are blocked by apply even if approved.
- Destination writes use project-root-safe path resolution.
- Source projects may live outside the target repo, but symlink traversal is constrained.
- New tooling follows the single-entrypoint/subcommand rule.
- Spur rules were made project-local and now pass through `bun run spur-check`.

#### Verification — 2026-06-10 (`/rd3:dev-verify 0018 --auto --fix all --force`)

**Status:** 9 findings → all fixed; R15/R16 partials → resolved in follow-on pass
**Scope:** `scripts/ts-base.ts`, `scripts/agent-convergence/*`, `scripts/tests/*`, `scripts/setup.ts`, direction docs
**Mode:** verify (Phase 7 SECU + Phase 8 traceability)
**Channel:** inline
**Gate:** `bun run check` → pass (70 tests, 100% funcs / 99.0% lines) · `bun run spur-check` → pass

##### P2 — Warnings (all FIXED)

| # | Title | Dimension | Location | Resolution |
|---|-------|-----------|----------|----------------|
| 1 | Over-broad reusable-code heuristics misroute `Mode: lib` skills and any "shared/utils/lib" wording to hard-blocked `ts-libs-candidate` | Correctness | `scripts/agent-convergence/classify.ts` | FIXED: ts-libs routing now requires `type: code` or a code-file extension + export signature |
| 2 | Symlink-escape guard covered skill dirs only; symlinked command/config files leaked external content into review artifacts | Security | `scripts/agent-convergence/discovery.ts` | FIXED: `resolvesInsideSource()` realpath check applied to all discovery paths |
| 3 | TOCTOU: apply re-read sourcePath but trusted artifact's recorded classification — content swapped after scan bypassed screening | Security | `scripts/agent-convergence/apply.ts` | FIXED: apply re-classifies live content before writing |

##### P3 — Info (all FIXED)

| # | Title | Dimension | Location | Resolution |
|---|-------|-----------|----------|----------------|
| 4 | No diff against existing destinations; `proposedChanges` always `create` | Correctness | `scripts/agent-convergence/review.ts` | FIXED: `createReview` diffs → `update`/`skip` actions |
| 5 | `review.targetRoot` trusted from artifact JSON; tampered artifact could redirect writes | Security | `scripts/ts-base.ts` | FIXED: apply rejects artifacts whose `targetRoot` differs from cwd |
| 6 | Missing tests: `unknown` classification, mode-mismatch blocking | Testability | `scripts/tests/agent-convergence.test.ts` | FIXED |

##### P4 — Suggestions (all FIXED)

| # | Title | Dimension | Location | Resolution |
|---|-------|-----------|----------|----------------|
| 7 | SKILL.md content read twice per skill during discovery | Efficiency | `scripts/agent-convergence/discovery.ts` | FIXED |
| 8 | `usage()` omitted `--review-dir` / `--review-id` | Usability | `scripts/ts-base.ts` | FIXED |
| 9 | Unescaped `\|` in rationale broke review markdown tables | Usability | `scripts/agent-convergence/review.ts` | FIXED |

##### R15/R16 follow-on pass (2026-06-11)

| # | Title | Location | Resolution |
|---|-------|----------|----------------|
| R15 | Mode-scoped capabilities lacked persistent annotation for setup-time pruning | `scripts/agent-convergence/capabilities.ts`, `apply.ts`, `setup.ts` | FIXED: `annotateSupportedModes()` writes frontmatter; `pruneModeScopedCapabilities()` removes non-matching; apply auto-annotates mode-specific files |
| R16 | No test for `.agents/skills` symlink wiring | `scripts/tests/agent-convergence.test.ts` | FIXED: 5 new tests covering annotation, pruning, symlink wiring, and existing-directory refusal |

**Fix-pass 2026-06-11:** All findings + both partials resolved. Tests 56 → 70; `bun run check` and `bun run spur-check` green; `bun run test-setup.ts app` smoke test passes.

**Verdict: PASS** — 0 findings, 17/17 requirements MET.


### Testing

Required command-level verification:

```bash
bun run lint
bun run test
```

Required behavior-level verification:

- Dry-run against a fixture source project creates a review artifact and no destination files.
- Approval run applies only explicitly approved candidate IDs.
- Re-running approval is idempotent.
- Sensitive candidates are blocked even if included in an approval artifact.
- Reusable utility candidates are classified as `ts-libs-candidate` and are not applied to `ts-base`.
- Mode-specific candidates are skipped or marked incompatible when the selected mode does not match.
- Symlink/adaptor creation never leaves dangling links.
- CLI tests verify the single entrypoint routes `converge scan`, `converge review`, and `converge apply`.

Verification evidence:

```bash
bun run lint
# PASS — Biome, root TypeScript, and scaffold TypeScript checks clean.

bun run test
# PASS — 56 tests, 0 failures, coverage above configured thresholds.

bun run spur-check
# PASS — lint, Spur pre-check, tests, and Spur post-check all clean.
```

### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |
| Task | `docs/tasks/0018_agent_capability_convergence_importer_for_mode_specific_project_templates.md` | Codex | 2026-06-10 |
| Docs | `AGENTS.md`, `README.md`, `docs/00_ADR.md`, `docs/01_PRD.md`, `docs/03_ARCHITECTURE.md` | Codex | 2026-06-10 |
| CLI | `scripts/ts-base.ts` | Codex | 2026-06-10 |
| Modules | `scripts/agent-convergence/*.ts` | Codex | 2026-06-10 |
| Tests | `scripts/tests/agent-convergence.test.ts`, `scripts/tests/ts-base-cli.test.ts` | Codex | 2026-06-10 |
| Spur | `.spur/rules/recommended.yaml`, `.spur/rules/typescript/*.yaml`, `.spur/rules/structure/test-location.yaml` | Codex | 2026-06-10 |

### References

- `AGENTS.md` — current repository operation contract and four-mode template description.
- `scripts/setup.ts` — current setup flow, mode-specific `AGENTS.md`/ADR swapping, and `.agents/skills` symlink creation.
- `.claude/skills` — intended canonical skill directory.
- `.claude/commands` — intended canonical slash-command directory.
- `.agents/skills` — current symlink to `.claude/skills`.
- `docs/tasks/0017_Project-level_ts-libs_monorepo_setup_toolchain_workspace_wiring_publish_workflow.md` — example of detailed task planning and implementation constraints.
- `~/xprojects/ts-libs` — reusable TypeScript library collection; inspect during implementation before finalizing ownership rules.
- `package.json` — existing `spur-check` scripts and current verification commands.
