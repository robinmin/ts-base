---
name: "Project-level: ts-libs monorepo setup, toolchain, workspace wiring, publish workflow"
description: "Project-level: ts-libs monorepo setup, toolchain, workspace wiring, publish workflow"
status: Done
created_at: 2026-05-28T05:58:43.863Z
updated_at: 2026-05-28T19:09:57.953Z
folder: docs/tasks
type: task
feature-id: ""
priority: high
estimated_hours: 4
tags: ["project","setup","monorepo","ci"]
impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: completed
  testing: completed
---

## 0017. "Project-level: ts-libs monorepo setup, toolchain, workspace wiring, publish workflow"

### Background

The four packages (`@gobing-ai/ts-utils`, `@gobing-ai/ts-runtime`, `@gobing-ai/ts-db`, `@gobing-ai/ts-infra`) need a monorepo to host them together. A single repo enables:

- **Shared toolchain** — one Biome config, one tsconfig preset, one CI pipeline
- **Cross-package development** — `workspace:*` protocol lets packages reference each other during development without publishing first
- **Atomic releases** — changes spanning multiple packages can be released together
- **Unified testing** — Bun workspace scripts fan out across all packages

The monorepo lives at `~/xprojects/ts-libs/` (already initialized with `package.json`). Uses Bun workspaces for dependency resolution and root script orchestration.

Package dependency chain: `utils` (zero-dependency) → `runtime` (→ utils) → `db` (→ runtime) → `infra` (→ runtime + db).


### Requirements

- [ ] Monorepo at `~/xprojects/ts-libs/` with root `package.json` containing `"workspaces": ["packages/*"]`
- [ ] Bun workspace scripts with `build`, `test`, `typecheck`, `lint` tasks and explicit package-order orchestration where dependency order matters
- [ ] Shared TypeScript config in `tooling/typescript/` — base tsconfig with strict mode, ESNext, bundler resolution; each package extends it
- [ ] Shared Biome config at root (`biome.json`) — 4-space indent, single quotes, semicolons, trailing commas, lineWidth 120
- [ ] Lefthook Git hooks: pre-commit (format), commit-msg (cog verify), pre-push (lint + typecheck)
- [ ] Root scripts include `build`, `test`, `typecheck`, `lint`, `format`, `autofix`, and `check` (`check = lint + test`) so package tasks can use one consistent verification gate
- [ ] GitHub Actions CI:
  - `ci.yml` — lint + typecheck + test on push/PR
  - `publish.yml` — publish packages to npm on release (triggered by release-please or manual dispatch)
- [ ] `.prototools` pinning Bun, Biome, cog, lefthook versions
- [ ] `release-please-config.json` for automated versioning and changelog
- [ ] Create package directories and placeholder manifests only; implementation tasks 0013-0016 own the actual source files and tests
- [ ] Each placeholder package has its own `package.json` with `"name": "@gobing-ai/ts-<name>"`, `"type": "module"`, `private: false`, `exports`, `files`, `sideEffects: false`, and correct initial `dependencies`/`peerDependencies`
- [ ] Each placeholder package has package-level scripts for `build`, `test`, `typecheck`, `lint`, and `check`
- [ ] `bun run build` succeeds across all packages
- [ ] `bun run test` passes with coverage ≥ 90% aggregate


### Q&A



### Design

Use a minimal library-only monorepo rather than promoting the full `src-monorepo/` app scaffold:

- Root owns shared orchestration only: Bun workspaces, Biome, TypeScript preset, Lefthook, release-please, and GitHub Actions.
- Packages are placeholders with real runnable scripts and smoke tests, but no domain implementation. Tasks 0013-0016 own library extraction.
- Package source stays TypeScript-first in `src/`; build emits ignored `dist/` JS and declarations for publish readiness.
- Internal dependencies use exact `0.1.0` ranges so package manifests are npm-publishable without relying on `workspace:*` rewrite behavior.
- Workflow files are created only in `~/xprojects/ts-libs/.github/workflows/`, not in this template repo.


### Solution

The monorepo structure follows the pattern from `ts-base/src-monorepo/` with adaptations for a library-only repo and a simpler Bun-native workspace runner:

```
~/xprojects/ts-libs/
├── package.json              # root: workspaces, scripts, devDeps
├── bun.lock
├── biome.json                # shared lint + format config
├── .prototools               # pinned tool versions
├── .lefthook.yml             # Git hooks
├── tsconfig.json             # root (references only)
├── release-please-config.json
├── .release-please-manifest.json
├── .github/
│   └── workflows/
│       ├── ci.yml            # lint + test on push/PR
│       └── publish.yml       # npm publish on release
├── tooling/
│   └── typescript/
│       ├── base.json         # shared tsconfig preset
│       └── package.json
└── packages/
    ├── utils/                # @gobing-ai/ts-utils placeholder for task 0013
    ├── runtime/              # @gobing-ai/ts-runtime placeholder for task 0014 (→ utils)
    ├── db/                   # @gobing-ai/ts-db placeholder for task 0015 (→ runtime)
    └── infra/                # @gobing-ai/ts-infra placeholder for task 0016 (→ runtime + db)
```

**Configuration decisions:**

- Root scripts use Bun workspace execution instead of Turbo. `build` and `typecheck` run packages explicitly in dependency order (`utils → runtime → db → infra`); `test` runs workspaces in parallel.
- Use `workspace:*` only if Bun/npm publishing in this repo is confirmed to rewrite it correctly. If not confirmed during task 0017, use exact package versions (`0.1.0`) for internal dependencies before the first publish to avoid publishing invalid workspace ranges.
- `release-please` monorepo mode: each package gets its own release PR and version tag (`@gobing-ai/ts-utils-v1.0.0`).
- GitHub Actions `publish.yml`: triggered by release tag or manual dispatch; uses `bun run build` then publishes each package from its package directory (`cd packages/<name> && npm publish --access public`) after verifying package versions and internal dependency ranges.

**Root package.json scripts:**
```json
{
  "scripts": {
    "build": "bun run --filter @gobing-ai/ts-utils build && bun run --filter @gobing-ai/ts-runtime build && bun run --filter @gobing-ai/ts-db build && bun run --filter @gobing-ai/ts-infra build",
    "test": "bun run --workspaces --parallel test",
    "typecheck": "bun run --filter @gobing-ai/ts-utils typecheck && bun run --filter @gobing-ai/ts-runtime typecheck && bun run --filter @gobing-ai/ts-db typecheck && bun run --filter @gobing-ai/ts-infra typecheck",
    "lint": "biome check . && bun run typecheck",
    "format": "biome check . --write",
    "autofix": "bun run format && bun run typecheck",
    "check": "bun run lint && bun run test",
    "prepare": "lefthook install"
  }
}
```

Implemented in `~/xprojects/ts-libs/` as a library-only Bun workspace:

- Root workspace/tooling files: `package.json`, `bun.lock`, `biome.json`, `.gitignore`, `.prototools`, `.lefthook.yml`, `tsconfig.json`
- Shared TypeScript preset: `tooling/typescript/base.json`
- Release metadata: `release-please-config.json`, `.release-please-manifest.json`
- GitHub workflows in the target project only: `.github/workflows/ci.yml`, `.github/workflows/publish.yml`
- Placeholder packages: `packages/{utils,runtime,db,infra}` with `package.json`, `tsconfig.json`, `tsconfig.build.json`, `src/index.ts`, `tests/index.test.ts`, and `README.md`

The placeholder package source and tests are authored in TypeScript. Build output is generated under ignored `dist/` directories.


### Plan

1. Verify `~/xprojects/ts-libs/` exists; if not, create it with `mkdir -p`
2. Write root `package.json` with workspaces config, packageManager `bun@1.3.14`, scripts, devDependencies (biome, lefthook, typescript, @types/bun, cocogitto if installed through project tooling)
3. Write Bun-native build/test/typecheck/lint script definitions
4. Write `biome.json` matching ts-base conventions (4-space, single quotes, semicolons, trailing commas, lineWidth 120)
5. Write `.prototools` pinning Bun, Biome, cog, lefthook
6. Write `.lefthook.yml` with commit-msg (cog), pre-commit (format), pre-push (lint + typecheck) hooks
7. Scaffold `tooling/typescript/` with `base.json` shared tsconfig preset
8. Scaffold GitHub Actions CI: `ci.yml` (lint + test) and `publish.yml` (npm publish)
9. Scaffold placeholder `packages/{utils,runtime,db,infra}` package manifests, `tsconfig.json`, empty `src/index.ts`, and smoke tests so Bun workspace scripts have runnable package tasks before implementation starts
10. Write `release-please-config.json` and `.release-please-manifest.json` for monorepo mode
11. Verify: `bun install` resolves all workspaces, `bun run lint`, `bun run typecheck`, `bun run build`, `bun run test`, and `bun run check` pass
12. Mark task done


### Review

PASS.

- Confirmed the scaffold was written under `~/xprojects/ts-libs/`; no workflow files were created in `ts-base`.
- Confirmed `dist/`, `.coverage`, `node_modules`, logs, and `.DS_Store` are ignored.
- Internal package dependency ranges use exact `0.1.0` versions instead of `workspace:*` to avoid publishing invalid workspace ranges.
- Removed Turbo after review; Bun 1.3.14 workspace script support is enough for this collection container and keeps the stack smaller.
- Existing untracked `~/xprojects/ts-libs/.spur/`, `data/`, and root `README.md` predated this implementation and were left in place.

## Verification — 2026-05-28

**Status:** PASS after fix pass
**Mode:** `rd3-dev-verify 0017 --auto --fix all --force`
**Scope:** `~/xprojects/ts-libs/` scaffold and task 0017 traceability
**Gate:** `bun run check` → PASS; `bun run build` → PASS

### Findings Fixed

| # | Title | Dimension | Location | Recommendation |
|---|---|---|---|---|
| 1 | Publish workflow npm auth was implicit | Correctness | `~/xprojects/ts-libs/.github/workflows/publish.yml` | Removed unsupported `registry-url` assumption from `setup-bun` usage and added explicit `npm config set //registry.npmjs.org/:_authToken "$NODE_AUTH_TOKEN"` before publishing. |
| 2 | Stale Turbo cache logs remained after Turbo removal | Usability | `~/xprojects/ts-libs/packages/*/.turbo/` | Removed generated `.turbo/` package log directories so the repo state matches the Bun-only decision. |

### Requirements Traceability

| Requirement | Verdict | Evidence |
|---|---|---|
| Monorepo root with Bun workspaces | MET | `~/xprojects/ts-libs/package.json` includes `workspaces: ["packages/*"]`. |
| Build/test/typecheck/lint orchestration | MET | Root scripts use Bun-native workspace/filter commands in dependency order where needed. |
| Shared TypeScript config | MET | `~/xprojects/ts-libs/tooling/typescript/base.json`; packages extend it. |
| Shared Biome config | MET | `~/xprojects/ts-libs/biome.json`; `bun run check` passes. |
| Lefthook hooks | MET | `~/xprojects/ts-libs/.lefthook.yml`; `bun install`/`proto use` install hooks/tools. |
| CI/publish workflows | MET | `~/xprojects/ts-libs/.github/workflows/{ci,publish}.yml`; publish auth fixed. |
| Proto tool pins | MET | `~/xprojects/ts-libs/.prototools` plus self-contained `.moon/plugins/{biome,cog}.yml`; `proto use` passes. |
| Release-please metadata | MET | `release-please-config.json` and `.release-please-manifest.json`. |
| Placeholder package manifests/scripts | MET | `packages/{utils,runtime,db,infra}/package.json`; package scripts run through root gates. |
| Build/test verification | MET | `bun run build`, `bun run check`, and package tests passed with 100% placeholder coverage. |


### Testing

- `tasks check 0017` — passed before implementation
- `bun install` — passed and generated `bun.lock`
- `bun run lint` — passed after adding `.gitignore`, formatting generated JSON, and removing deprecated `baseUrl`
- `bun run build` — passed across all four placeholder packages
- `bun run test` — passed across all four placeholder packages, 100% line/function coverage on placeholders
- `bun run check` — passed (`lint + test`)
- Turbo removal verification: `bun install`, `bun run check`, and ordered `bun run build` all passed with Bun-native workspace scripts
- Generated `dist/` JavaScript artifacts were removed after verification; authored workspace files are TypeScript/config only
- Forced verification fix pass: `proto use`, `bun run check`, and `bun run build` passed after fixing publish auth and removing stale `.turbo/` directories


### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |
| Monorepo scaffold | `~/xprojects/ts-libs/` | Codex | 2026-05-28 |
| CI workflow | `~/xprojects/ts-libs/.github/workflows/ci.yml` | Codex | 2026-05-28 |
| Publish workflow | `~/xprojects/ts-libs/.github/workflows/publish.yml` | Codex | 2026-05-28 |
| Packages | `~/xprojects/ts-libs/packages/{utils,runtime,db,infra}/` | Codex | 2026-05-28 |

### References
