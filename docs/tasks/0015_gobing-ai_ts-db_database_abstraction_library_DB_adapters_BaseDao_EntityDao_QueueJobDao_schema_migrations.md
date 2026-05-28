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

The `~/xprojects/spur/` project has a database abstraction layer built on Drizzle ORM with an adapter pattern that supports Bun SQL (and was designed to support PostgreSQL, SQLite, and Cloudflare D1). It provides:

1. **DB adapter interface** — `DbAdapter` with query, execute, transaction, and migration methods. Concrete adapters in `adapters/` (Bun SQL, with stubs for PG and D1).

2. **BaseDao** — Generic CRUD base class with `findById`, `findAll`, `create`, `update`, `delete`, plus transaction-aware `withTx`. All query methods accept an optional `SpanContext` for telemetry correlation.

3. **EntityDao** — Extends BaseDao for entities that carry `id`, `createdAt`, `updatedAt`, `version` fields. Adds `findByExternalId`, `findOrCreate`, optimistic locking via version.

4. **QueueJobDao** — Specialized DAO for the job queue table with `claimNext`, `completeJob`, `failJob`, `requeueJob` methods used by the job-queue subsystem in ts-infra.

5. **Migration tooling** — `migrate.ts` runs Drizzle migrations; `embedded-migrations.ts` bundles SQL migrations as inline strings for environments without filesystem access (Cloudflare Workers).

6. **Schema definitions** — Drizzle table definitions for the core domain (`runs`, `phase_runs`, `transition_runs`, `queue_jobs`, `workspaces`, `artifacts`, etc.).

7. **Span context** — `SpanContext` interface bridges the DB layer with telemetry, carrying `traceId` and `spanId` for distributed tracing.


### Requirements

- [ ] Package published to npm as `@gobing-ai/ts-db` (public, scoped)
- [ ] External dependencies: `drizzle-orm` (peer), `drizzle-kit` (dev, for migration generation)
- [ ] Internal dependency: `@gobing-ai/ts-runtime` (for `SpanContext` and `RuntimeContext` integration)
- [ ] ESM only (`"type": "module"`)
- [ ] Exports from barrel:
  - **Adapter** — `DbAdapter` interface, `BunSqlAdapter`
  - **BaseDao** — `BaseDao<T>` generic class with CRUD + `withTx`
  - **EntityDao** — `EntityDao<T>` with optimistic locking + `findByExternalId`
  - **QueueJobDao** — `QueueJobDao` with `claimNext`, `completeJob`, `failJob`, `requeueJob`
  - **Migrations** — `runMigrations`, `createMigrator`, `EmbeddedMigrations`
  - **Schema** — Drizzle table definitions for core domain entities
  - **Span context** — `SpanContext` interface (traceId, spanId)
- [ ] Tests ≥ 90% coverage per file
- [ ] Biome + tsc clean


### Q&A



### Design



### Solution

Extract from `~/xprojects/spur/packages/core/src/`:

| spur source | ts-libs target | Notes |
|---|---|---|
| `db/adapter.ts` | `src/adapter.ts` | `DbAdapter` interface + `AdapterConfig` |
| `db/adapters/bun-sql.ts` | `src/adapters/bun-sql.ts` | Bun SQL adapter implementation |
| `db/adapters/pg.ts` | `src/adapters/pg.ts` | PostgreSQL adapter (stub, skeleton) |
| `db/base-dao.ts` | `src/base-dao.ts` | Generic CRUD base class |
| `db/entity-dao.ts` | `src/entity-dao.ts` | Entity DAO with optimistic locking |
| `db/queue-job-dao.ts` | `src/queue-job-dao.ts` | Job queue persistence |
| `db/migrate.ts` | `src/migrate.ts` | Drizzle migration runner |
| `db/embedded-migrations.ts` | `src/embedded-migrations.ts` | Bundled SQL migrations for CF |
| `db/schema/*.ts` | `src/schema/*.ts` | Drizzle table definitions |
| `db/span-context.ts` | `src/span-context.ts` | Telemetry bridge interface |
| `db/artifact-dao.ts` | `src/artifact-dao.ts` | Artifact entity DAO |
| `db/workspace-dao.ts` | `src/workspace-dao.ts` | Workspace entity DAO |
| `db/run-dao.ts` | `src/run-dao.ts` | Run entity DAO |
| `db/phase-run-dao.ts` | `src/phase-run-dao.ts` | Phase run DAO |
| `db/transition-run-dao.ts` | `src/transition-run-dao.ts` | Transition run DAO |
| `db/run-event-dao.ts` | `src/run-event-dao.ts` | Run event DAO |
| `db/asset-ref-dao.ts` | `src/asset-ref-dao.ts` | Asset reference DAO |
| `db/constraint-finding-dao.ts` | `src/constraint-finding-dao.ts` | Constraint finding DAO |
| `db/gate-result-dao.ts` | `src/gate-result-dao.ts` | Gate result DAO |

**Adaptations:**
- Replace `@starter/core` imports with `@gobing-ai/ts-runtime` (for `SpanContext`, `RuntimeContext`) or `@gobing-ai/ts-utils` (for error types)
- `adapter.ts`: the `DbAdapter` interface's `RuntimeContext` dependency should use `RuntimeContext` from `@gobing-ai/ts-runtime`
- `base-dao.ts`: the transaction wrapper uses `DbAdapter.transaction` — ensure it works with Bun SQL adapter's transaction semantics
- `embedded-migrations.ts`: remove CF-specific `@cloudflare/workers-types`; use a minimal local type declaration matching the pattern in ts-runtime's `file-system-cf.ts`
- Schema files: domain-specific tables (runs, phases, etc.) are Spur-specific. Extract the core pattern but keep domain tables as examples or move them to `examples/`
- `migrate.ts`: replace any vitest-specific test helpers with Bun-compatible patterns


### Plan

1. Scaffold `packages/db/` with package.json, tsconfig.json, src/index.ts barrel (depends on `@gobing-ai/ts-runtime`, peer on `drizzle-orm`)
2. Extract `adapter.ts` + `adapters/bun-sql.ts` — the DB adapter interface and Bun SQL implementation
3. Extract `span-context.ts` — telemetry bridge (lightweight, just the interface)
4. Extract `base-dao.ts` — generic CRUD base class, depends on adapter
5. Extract `entity-dao.ts` — extends BaseDao with optimistic locking
6. Extract domain DAOs — artifact-dao, workspace-dao, run-dao, etc. (review each for Spur-specific coupling)
7. Extract `queue-job-dao.ts` — job queue persistence (needed by ts-infra's job-queue)
8. Extract `schema/*.ts` — Drizzle table definitions; separate core from domain-specific
9. Extract `migrate.ts` + `embedded-migrations.ts` — migration tooling
10. Copy and adapt tests for each subsystem; replace vitest with bun:test
11. Run `bun run check`, verify coverage ≥ 90%
12. Mark task done


### Review



### Testing



### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References


