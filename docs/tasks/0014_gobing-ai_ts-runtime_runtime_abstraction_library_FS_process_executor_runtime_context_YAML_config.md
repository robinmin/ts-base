---
name: "@gobing-ai/ts-runtime — runtime abstraction library (FS, process executor, runtime context, YAML config)"
description: "@gobing-ai/ts-runtime — runtime abstraction library (FS, process executor, runtime context, YAML config)"
status: Done
created_at: 2026-05-28T05:58:43.517Z
updated_at: 2026-05-28T21:15:47.819Z
folder: docs/tasks
type: task
feature-id: ""
priority: high
estimated_hours: 12
dependencies: ["0013"]
tags: ["package","runtime","config"]
impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: completed
  testing: completed
---

## 0014. "@gobing-ai/ts-runtime — runtime abstraction library (FS, process executor, runtime context, YAML config)"

### Background

The `~/xprojects/spur/` project has a runtime abstraction layer that allows the same application code to run on Bun/Node servers and Cloudflare Workers. It consists of three subsystems:

1. **FileSystem abstraction** — `FileSystem` interface with `readFile`, `writeFile`, `mkdir`, `exists`, `readDir`, `unlink`, `stat`, `realpath`. Two implementations: `NodeFileSystem` (node:fs/promises) and `CloudflareFileSystem` (CF storage API). Selected at startup via `setFileSystem()`.

2. **Process executor** — `ProcessExecutor` for spawning subprocesses with configurable timeouts, env vars, and working directory. Wraps `execa`. Useful for CLI tools and build scripts.

3. **Runtime context** — `RuntimeContext` which is a typed service locator (registry pattern). It owns generic capabilities and service registration only. It must not import concrete DB, event-bus, scheduler, telemetry, or logger implementations from downstream packages.

Plus the **YAML config builder** (`buildConfigFromObject`) which reads a parsed YAML object, interpolates `${ENV_VAR}` placeholders, deep-merges overrides, validates against a Zod schema, and returns a frozen `Config` object.

Extracting these into `@gobing-ai/ts-runtime` gives the monorepo a clean runtime boundary. `ts-db` and `ts-infra` will depend on it.


### Requirements

- [x] Package configured for npm publishing as `@gobing-ai/ts-runtime` (public, scoped); actual registry publish remains a release workflow action → **MET** | Evidence: `packages/runtime/package.json`
- [x] External dependencies: `execa` (process-executor), `yaml` (config parser), `zod` (config validation) → **MET** | Evidence: `packages/runtime/package.json` dependencies
- [x] ESM only (`"type": "module"`) → **MET** | Evidence: `packages/runtime/package.json` type: module
- [x] Exports from barrel:
  - **FileSystem** — `FileSystem` interface, `NodeFileSystem`, `CloudflareFileSystem`, `setFileSystem`, `getFs`, `walkDir`, `ensureDirForFile`, `atomicWriteFile`, `atomicWriteJson`, `readJsonFile`, `writeJsonFile`, `resolveProjectPath`, `getProjectRoot`, `createLogStream` → **MET** | Evidence: `packages/runtime/src/fs.ts` & `index.ts`
  - **Process executor** — `ProcessExecutor` interface, `NodeProcessExecutor`, `ProcessExecutorConfig`, `ProcessResult` → **MET** | Evidence: `packages/runtime/src/process-executor.ts`
  - **Runtime context** — `RuntimeContext`, `RuntimeScope`, `RuntimeServiceMap`, `createRuntimeContext`, `RuntimeContextOptions`, `RuntimeCapabilities`, `RuntimeFactory`, `LoadConfigOptions`, `SpanContext` → **MET** | Evidence: `packages/runtime/src/context.ts`
  - **Config** — `buildConfigFromObject`, `ConfigLoadError`, `configSchema`, `Config` type, `getDatabaseUrl`, `getNodeEnv`, `isTestEnv`, `deepMerge`, `flattenKeys`, `deFlattenKeys`, `interpolateEnv`, `interpolateTree` → **MET** | Evidence: `packages/runtime/src/config.ts`
- [x] Tests ≥ 90% coverage per file → **MET** | Evidence: `bun run check` reports 99.86% lines and 99.71% functions coverage
- [x] Biome + tsc clean → **MET** | Evidence: `bun run check` typecheck and biome lint pass cleanly


### Q&A



### Design

Implemented as a single-package runtime boundary under `~/xprojects/ts-libs/packages/runtime`.

Design choices:
- Keep runtime independent from DB, scheduler, event-bus, telemetry, and logger implementation packages.
- Use a generic `RuntimeContext` service registry so downstream packages can register concrete services without package cycles.
- Collapse small runtime subsystems into focused modules (`fs.ts`, `process-executor.ts`, `context.ts`, `config.ts`, `types.ts`) rather than recreating the app-specific Spur folder graph.
- Keep TypeScript imports extensionless, matching the project convention changed after task 0013.
- Use an `export *` barrel after verifying that Bun emitted invalid JS for explicit named re-export-only barrels.
- Add YAML-backed helpers (`parseConfigYaml`, `buildConfigFromYaml`) in addition to the required `buildConfigFromObject`, so the declared `yaml` dependency is actually exercised.


### Solution

Extract from `~/xprojects/spur/packages/core/src/`:

| spur source | ts-libs target |
|---|---|
| `runtime/file-system.ts` | `src/fs/types.ts` (interface) |
| `runtime/file-system-node.ts` | `src/fs/node.ts` |
| `runtime/file-system-cf.ts` | `src/fs/cloudflare.ts` |
| `runtime/context.ts` | `src/context.ts` |
| `runtime/types.ts` | `src/types.ts` |
| `runtime/select.ts` | `src/select.ts` |
| `runtime/node-bun.ts` | `src/runtime/node-bun.ts` or `src/node-bun.ts` |
| `runtime/cloudflare-workers.ts` | `src/runtime/cloudflare-workers.ts` or `src/cloudflare-workers.ts` |
| `runtime/index.ts` | barrel (part of `src/index.ts`) |
| `process-executor/process-executor.ts` | `src/process-executor.ts` |
| `process-executor/types.ts` | merged into `src/process-executor.ts` |
| `config/build-config.ts` | `src/config/build-config.ts` |
| `config/schema.ts` | `src/config/schema.ts` |
| `config/types.ts` | `src/config/types.ts` |
| `config/env.ts` | `src/config/env.ts` |
| `config/index.ts` | barrel (part of `src/index.ts`) |

**Adaptations:**
- Replace `@starter/core` imports with `@gobing-ai/ts-utils` (for error types, constants) or internal relative imports
- `context.ts`: remove imports of DB, event-bus, scheduler, telemetry, logger, and `QueueJobDao`; downstream packages register those services by interface/key to avoid package cycles (`runtime -> db -> infra -> runtime`)
- `types.ts`: define a lightweight `SpanContext` (`traceId`, `spanId`, optional baggage/attributes) here so `ts-db` can accept tracing context without importing `ts-infra` or OpenTelemetry
- `process-executor`: remove event-bus and telemetry coupling from the runtime package; keep optional callbacks/hooks for process lifecycle events if needed, and replace vitest-specific mock helpers with Bun-compatible patterns
- `config/schema.ts`: the Zod schema defines the top-level config shape — review and simplify for the library context (it was app-specific)
- `file-system-cf.ts`: remove `@cloudflare/workers-types` reference; use a minimal local type declaration
- Internal imports must use `.js` specifiers to match the template's TypeScript/Bundler setup

Implementation note: the `.js` import-specifier requirement was superseded by the project-level decision to use extensionless TypeScript imports. The final implementation and tests use extensionless relative imports and pass `bun run check` and `bun run build`.

**Package structure:**
```
packages/runtime/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts
│   ├── fs/
│   │   ├── types.ts
│   │   ├── node.ts
│   │   └── cloudflare.ts
│   ├── context.ts
│   ├── types.ts
│   ├── select.ts
│   ├── process-executor.ts
│   └── config/
│       ├── build-config.ts
│       ├── schema.ts
│       ├── types.ts
│       └── env.ts
└── tests/
    ├── fs/
    │   ├── node.test.ts
    │   └── cloudflare.test.ts
    ├── context.test.ts
    ├── select.test.ts
    ├── process-executor.test.ts
    └── config/
        ├── build-config.test.ts
        ├── schema.test.ts
        └── env.test.ts
```


### Plan

1. Scaffold `packages/runtime/` with package.json, tsconfig.json, src/index.ts barrel (depends on `@gobing-ai/ts-utils`)
2. Extract `fs/` subsystem — interfaces first, then Node implementation, then CF stub
3. Extract `context.ts` — RuntimeContext registry with typed get/register
4. Extract `types.ts` + `select.ts` — runtime detection and factory
5. Extract `process-executor.ts` — adapt from execa-based spur version
6. Extract `config/` subsystem — build-config, schema, env helpers
7. Copy and adapt tests for each subsystem; replace vitest with bun:test
8. Run package-level `bun run lint`, `bun run typecheck`, and `bun run test`; from the repo root also run `bun run check` if task 0017 created it
9. Mark task done


### Review

SECU review completed:

- Security: no secrets or credentials added; Cloudflare filesystem operations fail closed with storage guidance; config interpolation leaves unresolved environment placeholders intact.
- Encapsulation: `RuntimeContext` has no imports from DB, infra, telemetry, scheduler, logger, or event-bus packages.
- Correctness: process executor handles success, non-zero exits, rejection mode, env/cwd, streaming fallback, and timeout paths; filesystem helpers cover Node and Cloudflare behavior.
- Usability: all required public APIs are exported from the package barrel; `ConfigLoadError` carries Zod issues for diagnostics.
- Drift prevention: built dist entry was smoke-tested after fixing an invalid Bun barrel output; generated `dist/` artifacts were removed after verification to keep the repo pure TS.

**Verification verdict: PASS**

**Findings (All Fixed):**

| # | Title | Dimension | Location | Recommendation |
|---|-------|-----------|----------|----------------|
| 1 | Bypassing filesystem abstraction in `atomicWriteFile` | Correctness | `packages/runtime/src/fs.ts:181` | Add `rename` to the `FileSystem` interface and call `fs.rename` instead of importing direct Node `rename`. (FIXED) |
| 2 | Error propagation in `parseConfigYaml` | Usability | `packages/runtime/src/config.ts:124` | Wrap `parseYaml` in a `try...catch` block to throw consistent `ConfigLoadError` on syntax errors. (FIXED) |
| 3 | Unhandled disposal errors block subsequent services | Correctness | `packages/runtime/src/context.ts:72` | Wrap each service `dispose()` call in a `try...catch` block so a failure in one does not halt the entire teardown. (FIXED) |

**Fix-pass 2026-05-28T21:16:00Z:** 3 fixed, 0 failed, 0 skipped


### Testing

Verification run from `~/xprojects/ts-libs`:

- `bun install` — passed; lockfile updated for `execa`, `yaml`, and `zod`.
- `bun run format` — passed.
- `bun run check` — passed; Biome clean, workspace typecheck clean, all tests pass.
- `bun run build` — passed for all workspaces.
- Dist smoke test — passed: dynamic import of `packages/runtime/dist/index.js` exposed `NodeFileSystem`, `NodeProcessExecutor`, and `buildConfigFromYaml`.

Coverage for `@gobing-ai/ts-runtime`:

| File | Functions | Lines |
|---|---:|---:|
| All files | 99.71% | 99.86% |
| `src/config.ts` | 100.00% | 100.00% |
| `src/context.ts` | 100.00% | 100.00% |
| `src/fs.ts` | 98.25% | 99.19% |
| `src/index.ts` | 100.00% | 100.00% |
| `src/process-executor.ts` | 100.00% | 100.00% |
| `src/types.ts` | 100.00% | 100.00% |

Runtime tests: 23 tests, 75 assertions, 0 failures.

Generated `dist/` artifacts were removed after build verification.


### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |
| Source | `~/xprojects/ts-libs/packages/runtime/src/fs.ts` | Codex | 2026-05-28 |
| Source | `~/xprojects/ts-libs/packages/runtime/src/process-executor.ts` | Codex | 2026-05-28 |
| Source | `~/xprojects/ts-libs/packages/runtime/src/context.ts` | Codex | 2026-05-28 |
| Source | `~/xprojects/ts-libs/packages/runtime/src/config.ts` | Codex | 2026-05-28 |
| Source | `~/xprojects/ts-libs/packages/runtime/src/types.ts` | Codex | 2026-05-28 |
| Source | `~/xprojects/ts-libs/packages/runtime/src/index.ts` | Codex | 2026-05-28 |
| Tests | `~/xprojects/ts-libs/packages/runtime/tests/*.test.ts` | Codex | 2026-05-28 |

### References
