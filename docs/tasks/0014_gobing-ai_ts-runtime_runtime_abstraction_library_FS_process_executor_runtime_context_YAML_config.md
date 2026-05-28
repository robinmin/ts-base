---
name: "@gobing-ai/ts-runtime — runtime abstraction library (FS, process executor, runtime context, YAML config)"
description: "@gobing-ai/ts-runtime — runtime abstraction library (FS, process executor, runtime context, YAML config)"
status: Backlog
created_at: 2026-05-28T05:58:43.517Z
updated_at: 2026-05-28T05:58:43.517Z
folder: docs/tasks
type: task
feature-id: ""
priority: high
estimated_hours: 12
dependencies: ["0013"]
tags: ["package","runtime","config"]
impl_progress:
  planning: pending
  design: pending
  implementation: pending
  review: pending
  testing: pending
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

- [ ] Package published to npm as `@gobing-ai/ts-runtime` (public, scoped)
- [ ] External dependencies: `execa` (process-executor), `yaml` (config parser), `zod` (config validation)
- [ ] ESM only (`"type": "module"`)
- [ ] Exports from barrel:
  - **FileSystem** — `FileSystem` interface, `NodeFileSystem`, `CloudflareFileSystem`, `setFileSystem`, `getFs`, `walkDir`, `ensureDirForFile`, `atomicWriteFile`, `atomicWriteJson`, `readJsonFile`, `writeJsonFile`, `resolveProjectPath`, `getProjectRoot`, `createLogStream`
  - **Process executor** — `ProcessExecutor` interface, `NodeProcessExecutor`, `ProcessExecutorConfig`, `ProcessResult`
  - **Runtime context** — `RuntimeContext`, `RuntimeScope`, `RuntimeServiceMap`, `createRuntimeContext`, `RuntimeContextOptions`, `RuntimeCapabilities`, `RuntimeFactory`, `LoadConfigOptions`, `SpanContext`
  - **Config** — `buildConfigFromObject`, `ConfigLoadError`, `configSchema`, `Config` type, `getDatabaseUrl`, `getNodeEnv`, `isTestEnv`, `deepMerge`, `flattenKeys`, `deFlattenKeys`, `interpolateEnv`, `interpolateTree`
- [ ] Tests ≥ 90% coverage per file
- [ ] Biome + tsc clean


### Q&A



### Design



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



### Testing



### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References

