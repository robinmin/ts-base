---
name: "@gobing-ai/ts-db — database abstraction library (DB adapters, BaseDao, EntityDao, QueueJobDao, schema, migrations)"
description: "@gobing-ai/ts-db — database abstraction library (DB adapters, BaseDao, EntityDao, QueueJobDao, schema, migrations)"
status: Backlog
created_at: 2026-05-28T05:58:43.631Z
updated_at: 2026-05-28T05:58:43.631Z
folder: docs/tasks
type: task
feature-id: ""
priority: high
estimated_hours: 16
dependencies: ["0014"]
tags: ["package","db","drizzle"]
impl_progress:
  planning: pending
  design: pending
  implementation: pending
  review: pending
  testing: pending
---

## 0015. "@gobing-ai/ts-db — database abstraction library (DB adapters, BaseDao, EntityDao, QueueJobDao, schema, migrations)"

### Background

The `~/xprojects/spur/` project has a database abstraction layer built on Drizzle ORM with an adapter pattern that supports Bun SQLite (and was designed to support Cloudflare D1; PostgreSQL is not present in the current source tree). It provides:

1. **DB adapter interface** — `DbAdapter` with query, execute, transaction, and migration methods. Concrete adapters in `adapters/` (Bun SQLite from the source project, plus D1 if it can remain runtime-safe).

2. **BaseDao** — Generic CRUD base class with `findById`, `findAll`, `create`, `update`, `delete`, plus transaction-aware `withTx`. All query methods accept an optional `SpanContext` for telemetry correlation.

3. **EntityDao** — Extends BaseDao for entities that carry `id`, `createdAt`, `updatedAt`, `version` fields. Adds `findByExternalId`, `findOrCreate`, optimistic locking via version.

4. **QueueJobDao** — Specialized DAO for the job queue table with `claimNext`, `completeJob`, `failJob`, `requeueJob` methods used by the job-queue subsystem in ts-infra.

5. **Migration tooling** — `migrate.ts` runs Drizzle migrations; `embedded-migrations.ts` bundles SQL migrations as inline strings for environments without filesystem access (Cloudflare Workers).

6. **Schema definitions** — reusable Drizzle column helpers plus the `queue_jobs` table required by the shared job-queue library. Spur workflow/history tables are source examples, not default public API.

7. **Span context** — `SpanContext` interface bridges the DB layer with telemetry, carrying `traceId` and `spanId` for distributed tracing.


### Requirements

- [ ] Package published to npm as `@gobing-ai/ts-db` (public, scoped)
- [ ] External dependencies: `drizzle-orm` (peer), `drizzle-kit` (dev, for migration generation); use `bun:sqlite` for the Bun adapter, not a separate npm runtime package
- [ ] Internal dependency: `@gobing-ai/ts-runtime` (for `SpanContext` and optional `RuntimeContext` integration)
- [ ] ESM only (`"type": "module"`)
- [ ] Exports from barrel:
  - **Adapter** — `DbAdapter` interface, `BunSqliteAdapter`, optional `D1Adapter` if it is decoupled from Cloudflare ambient types
  - **BaseDao** — `BaseDao<T>` generic class with CRUD + `withTx`
  - **EntityDao** — `EntityDao<T>` with optimistic locking + `findByExternalId`
  - **QueueJobDao** — `QueueJobDao` with `claimNext`, `completeJob`, `failJob`, `requeueJob`
  - **Migrations** — `applyMigrations`/`runMigrations` naming must match the extracted implementation, `createMigrator`, `EmbeddedMigrations`
  - **Schema** — reusable Drizzle column helpers and the `queue_jobs` schema required by `ts-infra`; Spur workflow/history domain tables belong in `examples/spur/` unless explicitly kept as examples
  - **Span context** — re-export `SpanContext` from `@gobing-ai/ts-runtime`; do not depend directly on OpenTelemetry from `ts-db`
- [ ] Tests ≥ 90% coverage per file
- [ ] Biome + tsc clean


### Q&A



### Design



### Solution

Extract from `~/xprojects/spur/packages/core/src/`:

| spur source | ts-libs target | Notes |
|---|---|---|
| `db/adapter.ts` | `src/adapter.ts` | `DbAdapter` interface + `AdapterConfig` |
| `db/adapters/bun-sqlite.ts` | `src/adapters/bun-sqlite.ts` | Bun SQLite adapter implementation |
| `db/adapters/d1.ts` | `src/adapters/d1.ts` | Cloudflare D1 adapter, only if it can compile with local minimal types |
| `db/base-dao.ts` | `src/base-dao.ts` | Generic CRUD base class |
| `db/entity-dao.ts` | `src/entity-dao.ts` | Entity DAO with optimistic locking |
| `db/queue-job-dao.ts` | `src/queue-job-dao.ts` | Job queue persistence |
| `db/migrate.ts` | `src/migrate.ts` | Drizzle migration runner |
| `db/embedded-migrations.ts` | `src/embedded-migrations.ts` | Bundled SQL migrations for CF |
| `db/schema/common.ts` | `src/schema/common.ts` | Reusable Drizzle column helpers |
| `db/schema/queue-jobs.ts` | `src/schema/queue-jobs.ts` | Shared job queue table |
| `db/span-context.ts` | `src/span-context.ts` | Telemetry bridge interface |
| `db/{artifact,workspace,run,phase-run,transition-run,run-event,asset-ref,constraint-finding,gate-result}-dao.ts` | `examples/spur/*.ts` | Optional examples only; not part of the package barrel |
| `db/schema/{artifact,workspace,run,phase-run,transition-run,run-event,asset-ref,constraint-finding,gate-result,history-*}.ts` | `examples/spur/schema/*.ts` | Optional examples only; not part of the package barrel |

**Adaptations:**
- Replace `@starter/core` imports with `@gobing-ai/ts-runtime` (for `SpanContext`, `RuntimeContext`) or `@gobing-ai/ts-utils` (for error types)
- `adapter.ts`: the `DbAdapter` interface's `RuntimeContext` dependency should use `RuntimeContext` from `@gobing-ai/ts-runtime`
- `span-context.ts`: replace the source file's OpenTelemetry `Span` helpers with a plain `SpanContext` re-export from runtime; OpenTelemetry span management belongs in `ts-infra`
- `base-dao.ts`: the transaction wrapper uses `DbAdapter.transaction` — ensure it works with Bun SQLite adapter's transaction semantics
- `embedded-migrations.ts`: remove CF-specific `@cloudflare/workers-types`; use a minimal local type declaration matching the pattern in ts-runtime's `file-system-cf.ts`
- Schema files: domain-specific tables (runs, phases, history, artifacts, workspaces, etc.) are Spur-specific. Extract reusable schema helpers and `queue_jobs` for the infra job queue; move the rest to `examples/spur/` or leave them in Spur
- `migrate.ts`: replace any vitest-specific test helpers with Bun-compatible patterns
- Internal imports must use `.js` specifiers


### Plan

1. Scaffold `packages/db/` with package.json, tsconfig.json, src/index.ts barrel (depends on `@gobing-ai/ts-runtime`, peer on `drizzle-orm`)
2. Extract `adapter.ts` + `adapters/bun-sqlite.ts` — the DB adapter interface and Bun SQLite implementation
3. Extract `span-context.ts` — re-export the runtime `SpanContext` only; no OpenTelemetry dependency in this package
4. Extract `base-dao.ts` — generic CRUD base class, depends on adapter
5. Extract `entity-dao.ts` — extends BaseDao with optimistic locking
6. Extract `queue-job-dao.ts` — job queue persistence (needed by ts-infra's job-queue)
7. Extract reusable schema helpers and `schema/queue-jobs.ts`; move Spur-specific DAOs/tables to examples only if they compile cleanly without becoming package API
8. Extract optional example domain DAOs — artifact-dao, workspace-dao, run-dao, etc. — under `examples/spur/`, not the public barrel
9. Extract `migrate.ts` + `embedded-migrations.ts` — migration tooling
10. Copy and adapt tests for each subsystem; replace vitest with bun:test
11. Run package-level `bun run lint`, `bun run typecheck`, and `bun run test`; from the repo root also run `bun run check` if task 0017 created it
12. Mark task done


### Review



### Testing



### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References
