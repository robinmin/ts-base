---
name: "Project-level: ts-libs monorepo setup, toolchain, workspace wiring, publish workflow"
description: "Project-level: ts-libs monorepo setup, toolchain, workspace wiring, publish workflow"
status: Backlog
created_at: 2026-05-28T05:58:43.863Z
updated_at: 2026-05-28T05:58:43.863Z
folder: docs/tasks
type: task
feature-id: ""
priority: high
estimated_hours: 4
tags: ["project","setup","monorepo","ci"]
impl_progress:
  planning: pending
  design: pending
  implementation: pending
  review: pending
  testing: pending
---

## 0017. "Project-level: ts-libs monorepo setup, toolchain, workspace wiring, publish workflow"

### Background

The four packages (`@gobing-ai/ts-utils`, `@gobing-ai/ts-runtime`, `@gobing-ai/ts-db`, `@gobing-ai/ts-infra`) need a monorepo to host them together. A single repo enables:

- **Shared toolchain** — one Biome config, one tsconfig preset, one CI pipeline
- **Cross-package development** — `workspace:*` protocol lets packages reference each other during development without publishing first
- **Atomic releases** — changes spanning multiple packages can be released together
- **Unified testing** — `turbo run test` fans out across all packages

The monorepo lives at `~/xprojects/ts-libs/` (already initialized with `package.json`). Uses Turborepo for task orchestration and Bun workspaces for dependency resolution.

Package dependency chain: `utils` (zero-dependency) → `runtime` (→ utils) → `db` (→ runtime) → `infra` (→ runtime + db).


### Requirements

- [ ] Monorepo at `~/xprojects/ts-libs/` with root `package.json` containing `"workspaces": ["packages/*"]`
- [ ] Turborepo `turbo.json` with `build`, `test`, `typecheck`, `lint` tasks and proper `dependsOn` chains
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
- [ ] `bun run build` (turbo) succeeds across all packages
- [ ] `bun run test` passes with coverage ≥ 90% aggregate


### Q&A



### Design



### Solution

The monorepo structure follows the pattern from `ts-base/src-monorepo/` with adaptations for a library-only repo:

```
~/xprojects/ts-libs/
├── package.json              # root: workspaces, scripts, devDeps
├── bun.lock
├── turbo.json                # task graph
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

- `turbo.json`: `build` depends on `^build` (upstream packages built first, matching the dependency chain). `test` and `lint` have no `dependsOn` (can run in parallel). `typecheck` depends on `^typecheck` (need upstream `.d.ts` files).
- Use `workspace:*` only if Bun/npm publishing in this repo is confirmed to rewrite it correctly. If not confirmed during task 0017, use exact package versions (`0.1.0`) for internal dependencies before the first publish to avoid publishing invalid workspace ranges.
- `release-please` monorepo mode: each package gets its own release PR and version tag (`@gobing-ai/ts-utils-v1.0.0`).
- GitHub Actions `publish.yml`: triggered by release tag or manual dispatch; uses `bun run build` then publishes each package from its package directory (`cd packages/<name> && npm publish --access public`) after verifying package versions and internal dependency ranges.

**Root package.json scripts:**
```json
{
  "scripts": {
    "build": "turbo run build",
    "test": "turbo run test",
    "typecheck": "turbo run typecheck",
    "lint": "turbo run lint",
    "format": "biome check . --write",
    "autofix": "bun run format && bun run typecheck",
    "check": "bun run lint && bun run test",
    "prepare": "lefthook install"
  }
}
```


### Plan

1. Verify `~/xprojects/ts-libs/` exists; if not, create it with `mkdir -p`
2. Write root `package.json` with workspaces config, packageManager `bun@1.3.14`, scripts, devDependencies (turbo, biome, lefthook, typescript, @types/bun, cocogitto if installed through project tooling)
3. Write `turbo.json` with build/test/typecheck/lint task definitions
4. Write `biome.json` matching ts-base conventions (4-space, single quotes, semicolons, trailing commas, lineWidth 120)
5. Write `.prototools` pinning Bun, Biome, cog, lefthook
6. Write `.lefthook.yml` with commit-msg (cog), pre-commit (format), pre-push (lint + typecheck) hooks
7. Scaffold `tooling/typescript/` with `base.json` shared tsconfig preset
8. Scaffold GitHub Actions CI: `ci.yml` (lint + test) and `publish.yml` (npm publish)
9. Scaffold placeholder `packages/{utils,runtime,db,infra}` package manifests, `tsconfig.json`, empty `src/index.ts`, and smoke tests so Turbo has runnable package tasks before implementation starts
10. Write `release-please-config.json` and `.release-please-manifest.json` for monorepo mode
11. Verify: `bun install` resolves all workspaces, `bun run lint`, `bun run typecheck`, `bun run build`, `bun run test`, and `bun run check` pass
12. Mark task done


### Review



### Testing



### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References

