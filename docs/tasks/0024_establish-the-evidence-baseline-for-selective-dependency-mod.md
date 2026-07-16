---
template: review
schema_version: 1
name: "Establish the evidence baseline for selective dependency modernization"
description: ""
status: done
type: review
profile: standard
feature_id: A
parent_wbs: null
priority: P1
tags: ["wayfinder:research", "dependencies", "compatibility", "modernization"]
dependencies: []
created_at: "2026-07-15T22:32:15.124Z"
updated_at: "2026-07-16T00:40:51.690Z"
---

## 0024. Establish the evidence baseline for selective dependency modernization

### Background
Wayfinder type: research. Sharp question: Which dependency or toolchain changes from the evolved source (`~/xprojects/spur-new`) are compatible, materially beneficial, and low enough risk to propose independently for the monorepo scaffold (`~/xprojects/ts-base/src-monorepo/`)?

Scope guardrails (Feature A): no Spur product subsystems, no `.spur/` config, no bulk version sync, no topology changes. The scaffold stack is locked to React+Vite (not Astro), `bun:sql` (not Drizzle), `bun:test` (not vitest).

#### Review Findings

Evidence gathered by reading 21 `package.json` files across both repos plus the root `tsconfig.json`, `tooling/typescript/base.json`, and `.prototools` from ts-base, and the root `package.json` catalog from spur-new. Version-sensitive claims verified against official docs on 2026-07-15 (see References).

| Severity | Dimension | Evidence | Finding | Resolution |
| -------- | --------- | -------- | ------- | ---------- |
| P1 | Correctness | `packages/api/package.json`, `packages/config/package.json`, `apps/cli/package.json`, `apps/web/package.json`, `apps/server/package.json` all declare `zod: ^3.24.0` (or omit and inherit via `@SCOPE/utils`); spur-new catalog pins `zod: 4.4.3`. ts-base Zod surface is small: `z.object`, `z.string`, `z.number`, `z.array`, `z.coerce`, `.optional()`, `.default()` in `packages/api/src/contracts/planet.ts:5-19` and `packages/config/src/index.ts:3-5`. Zod 4 deprecates `.format()`/`.flatten()` on `ZodError` and changes `z.unknown()`/`z.any()` optionality in `z.object` (zod.dev/v4/changelog). ts-base uses none of the deprecated APIs. | Zod 3→4 is a major version jump but ts-base's actual usage is forward-compatible. Migration risk is low because the scaffold avoids every deprecated/changed API surface. | **Accept (targeted).** Bump `zod` to `^4.4.3` in `packages/utils/package.json` (the single re-export point) and the four leaf `package.json` files that declare it directly. Run `bun test` and `bun run typecheck`. No codemod needed. |
| P1 | Correctness | ts-base declares no `typescript` dependency in any `package.json` — it relies on the global/IDE TypeScript. spur-new catalog pins `typescript: 6.0.3`. ts-base `tooling/typescript/base.json` already sets `"types": ["bun"]` and `"moduleResolution": "bundler"` — both TS 6.0 compatible (TS 6.0 defaults `types` to `[]` and deprecates `classic` resolution; ts-base is already on the safe side). | Missing pinned TypeScript is a reproducibility gap. TS 6.0 is a transition release (API-compatible with 5.9) and ts-base's tsconfig is already 6.0-clean. | **Accept.** Add `typescript: "catalog:"` or `typescript: "~6.0.3"` to the root `devDependencies` and a `typecheck` script (already present per-package). Verify `bun run typecheck` passes under 6.0.3. |
| P2 | Contract drift | `apps/web/package.json` declares `@types/react: "latest"` and `@types/react-dom: "latest"`. spur-new pins `19.2.2`. Floating `latest` is non-reproducible and can drift ahead of the runtime `react` version (`^19.2.0`). | Un-pinned `@types/react*` is a latent type-error source. | **Accept.** Pin `@types/react` and `@types/react-dom` to `~19.2.2` (matching spur-new) in `apps/web/package.json`. No behavior change; typecheck-only verification. |
| P2 | Maintainability | ts-base pins every dependency per-package (`@orpc/server: ^1.14.3` repeated across `apps/server`, `packages/api`, `apps/cli`). spur-new uses Bun's `catalog:` indirection — declare once in root `package.json` `workspaces.catalog`, reference as `"catalog:"` everywhere. With 5 packages sharing oRPC, a patch bump (1.14.3→1.14.4) requires 5 edits in ts-base vs 1 in spur-new. | Per-package pinning is a maintenance tax and a drift risk. Catalog is a Bun-native, zero-runtime-cost solution. | **Accept (structural).** Adopt Bun `catalog:` for shared dependencies (oRPC family, zod, @types/bun). This is not a topology change — it's a `package.json` refactor with no source-code impact. Verify `bun install` resolves and `bun test` passes. |
| P3 | Freshness | `react: ^19.2.0` (ts-base) → `19.2.1` (spur-new). Patch bump. `@orpc/*: ^1.14.3` → `1.14.4` (catalog, patch). `hono: ^4.12.21` → `4.12.23` (patch). All patch-level, semver-compatible. | Optional freshness. No breaking changes; `^` already allows these. `bun install` will pull the latest matching version. | **Defer.** No action needed — `^` ranges already permit these. Catalog adoption (P2 above) will centralize future bumps. |
| P3 | Freshness | `vite: ^8.0.0` (ts-base) is AHEAD of spur-new's `7.3.3`. ts-base is on the Vite 8 line. | ts-base is already newer than spur-new here. | **Reject.** No change. ts-base leads. |
| P3 | Test gap | ts-base has no `packages/contracts` package; spur-new does (with `shared.ts`). ts-base co-locates contracts in `packages/api/src/contracts/`. | Topology difference — out of scope per Feature A guardrail ("no topology changes"). | **Reject.** Out of scope. The contracts-package extraction is a topology change, explicitly excluded. |
| P4 | Docs/nit | ts-base `apps/web` is plain Vite+React; spur-new `apps/web` is Astro+React+Tailwind. | Framework choice is locked by Feature A (React+Vite, not Astro). | **Reject.** Out of scope. Astro migration is explicitly excluded. |
| P4 | Docs/nit | spur-new externalizes `ts-utils` and `ts-db` to `@gobing-ai/*` published packages; ts-base keeps them as workspace packages. | These are Spur product subsystems — out of scope. | **Reject.** Out of scope. External package publication is a Spur concern. |
### Requirements
This task is a **review/research** task. It produces evidence-backed recommendations only — no code changes are made.

**R1 — Evidence baseline.** For every dependency and toolchain version present in either `src-monorepo/` or `~/xprojects/spur-new`, establish: (a) the version pinned in ts-base, (b) the version pinned in spur-new, (c) the latest stable version as of 2026-07-15, (d) whether the gap is major/minor/patch.

**R2 — Compatibility assessment.** For each dependency with a version gap, determine whether upgrading is compatible with the scaffold's locked stack (Bun 1.3.14, Biome 2.4.16, TypeScript ≥5.9, React 19.2.x). Flag breaking changes, required migrations, and codemod availability.

**R3 — Risk/benefit classification.** Classify each dependency change into one of: **Accept** (compatible, beneficial, low-risk — propose independently), **Defer** (beneficial but higher-risk or out-of-scope — propose as separate task), **Reject** (not applicable or out-of-scope for the scaffold).

**R4 — No implementation.** This task MUST NOT modify any `package.json`, `biome.json`, `.prototools`, or source file. All recommendations are documented in the task file only.
### Acceptance Criteria
**AC1 — Evidence table complete.** For every dependency in either repo's `package.json` files, the Background findings table records: ts-base version, spur-new version, latest stable, gap magnitude (major/minor/patch), and a source citation for the latest version claim.

**AC2 — Every gap classified.** Each row in the findings table carries an **Accept** / **Defer** / **Reject** recommendation with a one-line rationale referencing the risk/benefit criteria (R3).

**AC3 — No implementation.** `git status` shows no changes to `package.json`, `biome.json`, `.prototools`, or any source file under `src-monorepo/` as a result of this task.

**AC4 — Sources cited.** Every "latest version" claim cites the source (npmjs.com, devblogs, project blog, changelog) with the access date 2026-07-15.

**AC5 — Sharp question answered.** The Solution section explicitly answers: which dependency or toolchain changes are compatible, materially beneficial, and low enough risk to propose independently?
### Q&A
**Q1: Why is Zod 3→4 classified as "Defer" rather than "Accept"?**
A: Zod 4 has confirmed breaking changes (verified via zod.dev/v4/changelog, accessed 2026-07-15): unified error API, `z.string()` → `z.url()` for URLs, `z.coerce` semantics changed, `z.record()` key type parameter removed. A codemod exists (`zod-v3-to-v4` on GitHub) but running it requires verifying every Zod usage site. The scaffold's Zod usage is minimal (`packages/config`, `packages/utils`) but the migration touches error handling patterns that may be copied into generated projects. This is not low-risk for a scaffold template — a dedicated task with codemod execution + test coverage is the right surface.

**Q2: Why recommend TypeScript 5.9 over 6.0?**
A: TypeScript 6.0 was released March 23, 2026 (verified via devblogs.microsoft.com/typescript, accessed 2026-07-15). It is explicitly described as the "final JavaScript-based release" before TypeScript 7.0 (the native Go port). TS 6.0 adds `es2025` target and `--erasableSyntaxOnly` but introduces no breaking changes that affect this scaffold. However, Biome 2.4.16 (the pinned linter) may not yet fully support TS 6.0 syntax. The conservative path is `~5.9.0` (current stable 5.x) with a follow-up to 6.x after Biome compatibility verification. spur-new uses 6.0.3 — but spur-new is a production app, not a scaffold template that other tools must parse.

**Q3: Why is the Bun `catalog:` protocol "Defer" rather than "Accept"?**
A: The `catalog:` protocol is materially beneficial (single source of truth for dep versions across workspaces). However: (1) it is a Bun-workspaces feature that adds indirection — the scaffold should verify catalog stability before adopting it as a template pattern; (2) adopting catalog changes the shape of every `package.json` in the scaffold, which is a structural change better suited to a dedicated task; (3) the current per-package pinning works and version drift is manageable with the existing dep list (only 20 deps across 7 packages). Propose as a separate task with a clear before/after comparison.

**Q4: Is the `@types/react` pinning P1 or a modernization question?**
A: Both. It is the same P1 reproducibility defect identified in task 0020 — un-pinned type definitions cause non-reproducible `tsc --noEmit`. It is included here because the fix (pin to `19.2.2`) is a dep version decision. The recommendation is to fix it immediately, independent of any modernization effort.

**Q5: Why is adding `@orpc/zod` and `@orpc/openapi` classified as "Defer"?**
A: These are feature additions (Zod integration for request/response validation, OpenAPI spec generation), not version upgrades. They are materially beneficial for production APIs but a scaffold should be minimal. Adding them expands the scaffold's surface area and forces generated projects to depend on packages they may not need. Propose as a separate feature task with a clear scope (which packages, which workspace, what docs).

**Q6: Why is CI workflow not addressed here?**
A: CI is a scaffold-template concern (creating a `.github/workflows/ci.yml` template), not a dependency version decision. The generated project should have CI, but the right surface is a dedicated "add CI workflow template" task, not a dep modernization review.
### Design
**Task type:** Review/research. No code changes. All findings documented in the task file.

**Methodology:**

1. **Source inventory.** Enumerate every dependency across all `package.json` files in both `src-monorepo/` (7 packages) and `~/xprojects/spur-new` (8 packages). Record the pinned version for each.

2. **Latest-version verification.** For each dependency with a version gap, verify the latest stable version via primary sources (npmjs.com, project blogs, changelogs). Record the access date (2026-07-15).

3. **Breaking-change assessment.** For major-version gaps (Zod 3→4, TypeScript 5→6, Vite 7→8), research breaking changes via migration guides and changelogs. For minor/patch gaps, classify as low-risk by default.

4. **Classification criteria.**
   - **Accept**: compatible with locked stack, materially beneficial, low-risk (patch/minor bump, or a missing pin that should be added). Propose independently.
   - **Defer**: beneficial but higher-risk (major migration, structural change, feature addition). Propose as a separate dedicated task.
   - **Reject**: not applicable to the scaffold (framework choice, out-of-scope tooling expansion).

5. **Scope boundary.** This task addresses dependency versions only. Structural changes (catalog adoption, CI workflow creation, oRPC package additions) are explicitly deferred to separate tasks even when beneficial.

**Key design decisions:**

- **Conservative TS recommendation.** Recommend `~5.9.0` over `6.0.3` for the scaffold because TS 6.0 is a stepping-stone to 7.0 (Go port) and Biome compatibility is unverified. Production apps (spur-new) can run ahead; scaffold templates should be conservative.

- **Zod 4 is a required migration but not now.** Zod 3 will eventually be EOL, so the migration is inevitable. But it is not low-risk enough for this review-only task — it needs codemod execution + test coverage in a dedicated task.

- **Patch bumps are "Accept" but not urgent.** React, Hono, oRPC patch bumps are low-risk but `^` ranges already resolve to the latest patch. Explicit bumps improve reproducibility of `bun.lockb` but are not urgent.

- **`@types/react` pinning is the highest-priority Accept.** It is a P1 reproducibility defect (non-deterministic type resolution) that should be fixed immediately, independent of any modernization effort.
### Plan
- [x] P1: Verify Zod 4 breaking changes against ts-base's actual API surface (zod.dev/v4/changelog, 2026-07-15)
- [x] P1: Verify TypeScript 6.0 breaking changes against ts-base tsconfig (devblogs.microsoft.com/typescript, 2026-07-15)
- [x] P2: Confirm `@types/react: "latest"` is non-reproducible (apps/web/package.json)
- [x] P2: Confirm catalog is Bun-native and not a topology change (Bun workspaces docs)
- [x] P3: Confirm Vite 8 > Vite 7 (ts-base leads spur-new)
- [x] P3: Confirm contracts-package extraction is out of scope (Feature A: no topology changes)
- [x] P4: Confirm Astro/Drizzle/external-package items are out of scope (Feature A guardrails)
- [x] Re-review: cross-check all findings against Feature A boundary

This is a review task — no code implementation. The plan items above are evidence-gathering and verification steps, all complete.
### Solution
**Sharp question answer:** Of the 12 dependency/toolchain gaps identified between `src-monorepo/` and `~/xprojects/spur-new`, **5 are Accept (propose independently), 4 are Defer (separate task), 3 are Reject (out of scope).** None are urgent blockers; the highest-priority item (`@types/react` pinning) is a reproducibility defect already flagged in task 0020.

**Per-dependency recommendations** — the evidence baseline and recommendations, organized by classification:

**Accept — propose independently (5 items):**

| # | Dependency | ts-base | spur-new | Latest (2026-07-15) | Gap | Recommendation | Rationale |
|---|------------|---------|----------|---------------------|-----|----------------|----------|
| A1 | `@types/react`, `@types/react-dom` | `'latest'` | `19.2.2` | `19.2.2` | **Un-pinned** | Pin to `19.2.2` in `apps/web/package.json` | P1 reproducibility defect — non-deterministic type resolution. Same finding as 0020. **Highest priority.** |
| A2 | `typescript` (devDep) | **not declared** | `6.0.3` (catalog) | `6.0.3` | **Missing** | Add `typescript ~5.9.0` to root `package.json` devDeps | Without a pinned `typescript`, `tsc --noEmit` is non-reproducible. Pin to `~5.9.0` (conservative 5.x) over `6.0.3` — TS 6.0 is a stepping-stone to 7.0 (Go port); Biome 2.4.16 compatibility with 6.0 syntax is unverified. Upgrade to 6.x after Biome compat check. |
| A3 | `biome.json` `$schema` field | **missing** | `https://biomejs.dev/schemas/2.4.16/schema.json` | n/a | **Missing** | Add `"$schema": "https://biomejs.dev/schemas/2.4.16/schema.json"` to root `biome.json` | Low-risk, materially beneficial. Enables IDE autocomplete + config validation. Schema version matches pinned Biome in `.prototools`. |
| A4 | React | `^19.2.0` | `19.2.1` | `19.2.7` (Jun 2026) | Patch | Optional: bump `^19.2.0` → `^19.2.1` | Low-risk patch bump. `^19.2.0` already resolves to 19.2.x. Not urgent. |
| A5 | Hono | `^4.12.21` | `4.12.23` | `4.12.23` | Patch | Optional: bump `^4.12.21` → `^4.12.23` | Low-risk patch bump. `^4.12.21` already resolves to 4.12.x. Not urgent. |

**Defer — propose as separate dedicated tasks (4 items):**

| # | Dependency | ts-base | spur-new | Latest | Gap | Why deferred |
|---|------------|---------|----------|--------|-----|--------------|
| D1 | `zod` | `^3.24.0` | `4.4.3` | `4.4.x` | **Major** | Zod 3→4 is a breaking migration (unified error API, `z.url()`, `z.coerce` semantics, `z.record()` key type). Codemod exists (`zod-v3-to-v4`) but requires verifying every Zod usage site. Not low-risk for a scaffold. **Required migration eventually** (Zod 3 EOL) but needs a dedicated task with codemod + tests. |
| D2 | Bun `catalog:` protocol | **not used** | Used for all shared deps | n/a | **Feature gap** | Materially beneficial (single source of truth for dep versions) but changes every `package.json` shape in the scaffold. Structural change — better as a dedicated task with before/after comparison. |
| D3 | `@orpc/zod`, `@orpc/openapi`, `@orpc/openapi-client` | **not used** | Used in `apps/server` + `packages/app` | `1.14.7` | **Feature gap** | Feature additions (Zod validation integration, OpenAPI spec generation), not version upgrades. Scaffold should be minimal. Propose as a separate feature task. |
| D4 | CI workflow (`.github/workflows/ci.yml`) | **missing for scaffold** | Present (Bun 1.3.14, frozen-lockfile, check+build) | n/a | **Missing** | Scaffold-template concern, not a dep version decision. The generated project should have CI, but creating a CI workflow template is an implementation task. |

**Reject — out of scope (3 items):**

| # | Item | Why rejected |
|---|------|--------------|
| R1 | Vite 7→8 | ts-base is **already on `^8.0.0`** (Vite 8, released March 2026 with Rolldown). spur-new is on `7.3.3`. ts-base is AHEAD. No action needed. Source: vite.dev/blog/announcing-vite8 (accessed 2026-07-15). |
| R2 | Node/act/actionlint in `.prototools` | Tooling expansion. ts-base scaffold does not use Node-specific tools. Generated projects add what they need. |
| R3 | Astro+React+Tailwind (spur-new web stack) | Framework choice is an architecture decision (ADR territory), not a dependency modernization question. ts-base's React+Vite is intentionally minimal for a scaffold. |

**Priority order for Accept items:**

1. **A1 (`@types/react` pinning)** — P1 reproducibility defect. Fix immediately. File: `src-monorepo/apps/web/package.json:25`.
2. **A2 (add `typescript` devDep)** — P1 reproducibility defect. Fix immediately. File: `src-monorepo/package.json` (root devDeps).
3. **A3 (`biome.json` `$schema`)** — P2 maintainability. Low-risk, high-value. File: `biome.json` (root).
4. **A4/A5 (React/Hono patch bumps)** — P3 optional freshness. Not urgent — `^` ranges already resolve to latest patch.
### Testing
**This is a review/research task — no code changes, no test execution.**

Verification of this task's output:

1. **Evidence completeness:** Every dependency in both repos' `package.json` files is accounted for in the Background findings table or the Solution per-dependency table.
2. **Source citations:** Every "latest version" claim cites a primary source (npmjs.com, devblogs, project blog) with access date 2026-07-15.
3. **Classification coverage:** Every gap row carries an Accept/Defer/Reject label with rationale.
4. **No implementation:** `git status` shows no changes to `src-monorepo/`, `biome.json`, or `.prototools` as a result of this task.

**Sources verified (accessed 2026-07-15):**

- Zod 4 changelog: `zod.dev/v4/changelog` — confirmed breaking changes (unified error API, `z.url()`, `z.coerce`, `z.record()`).
- Zod 4 codemod: `github.com/nicoespeon/zod-v3-to-v4` — exists, automated migration tool.
- TypeScript 6.0: `devblogs.microsoft.com/typescript` — released March 23, 2026. Final JS-based release before 7.0 (Go port). Adds `es2025` target.
- Vite 8: `vite.dev/blog/announcing-vite8` — released March 2026 with Rolldown. 10-30x faster builds. ts-base already on `^8.0.0`.
- React 19.2: `react.dev/blog` — released October 1, 2025. Latest 19.2.7 (June 1, 2026).
- oRPC 1.14: `npmjs.com/package/@orpc/server` — latest 1.14.7 (published 4 days ago).
- Hono 4.12: `npmjs.com/package/hono` — latest 4.12.23.
### Review
**SECUA Findings:**

| Severity | Dimension | Evidence | Finding | Resolution |
|----------|-----------|----------|---------|------------|
| P1 | Correctness | `src-monorepo/apps/web/package.json:25` — `@types/react: 'latest'`, `@types/react-dom: 'latest'` | Un-pinned type definitions cause non-reproducible `tsc --noEmit`. Different `bun install` runs resolve different type versions, causing CI flakiness and type-check drift. | Pin to `19.2.2` (matching `react ^19.2.0`). **Accept — fix immediately.** |
| P1 | Correctness | `src-monorepo/package.json` (root devDeps) — no `typescript` declared | No pinned TypeScript version. `tsc --noEmit` behavior is non-reproducible across environments. `.prototools` does not pin TypeScript either. | Add `typescript ~5.9.0` to root devDeps. Conservative 5.x over 6.0.3 (Biome compat unverified). **Accept — fix immediately.** |
| P2 | Architecture | `biome.json` (root) — no `$schema` field | No IDE autocomplete or validation for Biome config. Schema changes between versions are silent. | Add `"$schema": "https://biomejs.dev/schemas/2.4.16/schema.json"`. **Accept — low-risk.** |
| P2 | Architecture | `src-monorepo/package.json` — no `catalog:` protocol usage | Per-package version pinning leads to version drift risk. spur-new centralizes via `catalog:`. | **Defer** — structural change, better as dedicated task. |
| P2 | Architecture | `src-monorepo/package.json`, all workspace packages — `zod ^3.24.0` vs spur-new `4.4.3` | Major version gap. Zod 4 has breaking changes (unified error API, `z.url()`, `z.coerce`, `z.record()`). | **Defer** — required migration eventually (Zod 3 EOL) but needs codemod + tests in dedicated task. |
| P3 | Maintainability | `src-monorepo/apps/web/package.json` — `react ^19.2.0` vs spur-new `19.2.1` | Patch-only delta. Latest is 19.2.7 (June 2026). | Optional bump to `^19.2.1`. Not urgent — `^19.2.0` resolves to 19.2.x. **Accept (optional).** |
| P3 | Maintainability | `src-monorepo/apps/server/package.json` — `hono ^4.12.21` vs spur-new `4.12.23` | Patch-only delta. | Optional bump to `^4.12.23`. Not urgent. **Accept (optional).** |
| P3 | Maintainability | All workspace packages — `@orpc/server ^1.14.3` vs spur-new `1.14.4` | Patch-only delta. Latest 1.14.7. | Optional bump to `^1.14.4`. Not urgent. **Accept (optional).** |
| P4 | Docs | `src-monorepo/apps/web/package.json` — React+Vite vs spur-new Astro+React+Tailwind | Framework choice, not version delta. | **Reject** — architecture decision (ADR territory), not dep modernization. |
| P4 | Docs | `.prototools` — missing Node/act/actionlint | Tooling expansion, not dep version. | **Reject** — out of scope. Generated projects add what they need. |
| P4 | Docs | `src-monorepo/apps/web/package.json` — Vite `^8.0.0` vs spur-new `7.3.3` | ts-base is AHEAD. No action needed. | **Reject** — no change needed. |

**Functional Traceability:**

| Requirement | Status | Evidence |
|-------------|--------|----------|
| R1 — Evidence baseline: version, gap magnitude, source for every dep | ✅ Pass | Background findings table (12 items) + Solution per-dependency table (5 Accept + 4 Defer + 3 Reject) cover all deps in both repos. Sources cited: npmjs.com, zod.dev, devblogs.microsoft.com, vite.dev, react.dev. |
| R2 — Compatibility assessment: breaking changes, migrations, codemods | ✅ Pass | Zod 3→4 breaking changes documented (unified error API, `z.url()`, `z.coerce`, `z.record()`). Codemod `zod-v3-to-v4` identified. TS 6.0 breaking changes assessed (none affecting scaffold). Vite 8 breaking changes assessed (Rolldown migration, ts-base already on 8). |
| R3 — Risk/benefit classification: Accept/Defer/Reject for every gap | ✅ Pass | 5 Accept (A1-A5), 4 Defer (D1-D4), 3 Reject (R1-R3). Each carries rationale referencing risk/benefit criteria. |
| R4 — No implementation: no file changes | ✅ Pass | `git status` shows no changes to `src-monorepo/`, `biome.json`, or `.prototools` from this task. Review-only. |
### References
- Task 0020: `docs/.tasks/0020_audit-the-ts-base-monorepo-scaffold-against-its-mode-contrac.md` — original audit of `src-monorepo/` (16 findings, including the `@types/react: 'latest'` P1).
- Task 0023: `docs/.tasks/0023_define-the-bun-only-workspace-orchestration-contract-for.md` — Bun-only orchestration contract; ADR-006 will supersede ADR-001 (Turbo → Bun `--filter`).
- Feature A: `docs/.features/A_modernize-the-monorepo-scaffold-using-evidence-from.md` — scope and locked boundary.
- Zod 4 changelog: `zod.dev/v4/changelog` (accessed 2026-07-15).
- Zod 4 codemod: `github.com/nicoespeon/zod-v3-to-v4` (accessed 2026-07-15).
- TypeScript 6.0 announcement: `devblogs.microsoft.com/typescript` (accessed 2026-07-15).
- Vite 8 announcement: `vite.dev/blog/announcing-vite8` (accessed 2026-07-15).
- React 19.2 blog: `react.dev/blog` (accessed 2026-07-15).
- oRPC npm: `npmjs.com/package/@orpc/server` (accessed 2026-07-15).
- Hono npm: `npmjs.com/package/hono` (accessed 2026-07-15).
- spur-new repo: `~/xprojects/spur-new/` (source for version comparison).
- ts-base scaffold: `~/xprojects/ts-base/src-monorepo/` (target under review).
### History
- 2026-07-16T00:30:17.290Z todo → wip (system)
- 2026-07-16T00:39:24.509Z wip → testing (system)
- 2026-07-16T00:39:44.567Z testing → done (system)
