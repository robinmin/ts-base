---
name: "@gobing-ai/ts-infra — infrastructure library (event-bus, events, job-queue, scheduler, api-client, telemetry, logger)"
description: "@gobing-ai/ts-infra — infrastructure library (event-bus, events, job-queue, scheduler, api-client, telemetry, logger)"
status: Backlog
created_at: 2026-05-28T05:58:43.743Z
updated_at: 2026-05-28T05:58:43.743Z
folder: docs/tasks
type: task
feature-id: ""
priority: high
estimated_hours: 20
dependencies: ["0014","0015"]
tags: ["package","infra","telemetry","jobs","events"]
impl_progress:
  planning: pending
  design: pending
  implementation: pending
  review: pending
  testing: pending
---

## 0016. "@gobing-ai/ts-infra — infrastructure library (event-bus, events, job-queue, scheduler, api-client, telemetry, logger)"

### Background

The `~/xprojects/spur/` project has an infrastructure layer that provides the application backbone — services wired together at bootstrap via `RuntimeContext`. It consists of seven subsystems:

1. **Event bus** (`event-bus/`) — Typed pub/sub system. `EventBus` class supports `emit`, `on`, `once`, `off` with typed event maps. Includes `DefaultObservers` for built-in reactions (console logging, metrics emission) and `FileObserver` for watch-based file processing. Events carry `EventContext` (traceId, spanId, timestamp).

2. **Events** (`events/`) — Application event definitions (`AppEvents` type map) and `createSystemBus()` factory that wires up the bus with default observers. `DefaultResponses` map events to handler chains.

3. **Job queue** (`job-queue/`) — DB-backed persistent job queue. `DbQueue` enqueues jobs with payload, priority, delay, and retry config. `DbConsumer` polls the queue, claims jobs via `QueueJobDao.claimNext()`, executes handlers, and records results. Supports concurrent consumers, exponential backoff retries, and dead-letter queue.

4. **Scheduler** (`scheduler/`) — Cron-like scheduled action runner. `Scheduler` interface with `register(cron, handler)` and `start/stop`. Three adapters: `NodeScheduler` (node-cron), `CloudflareScheduler` (CF Cron Triggers), `NoopScheduler` (testing). `SchedulerFactory` selects adapter at startup based on runtime detection.

5. **Telemetry** (`telemetry/`) — OpenTelemetry SDK wrapper. `TelemetrySDK` initializes tracing + metrics exporters. `Tracing` provides `startSpan`, `getActiveSpan`, `withSpan` helpers. `Metrics` exposes counters, histograms, gauges. `DbSanitize` scrubs SQL queries before export. Configurable via `TelemetryConfig`.

6. **API client** (`api-client.ts`) — Typed HTTP client builder wrapping `fetch`. Supports base URL, default headers, retry logic, timeout, and response validation against Zod schemas.

7. **Logger** (`logger.ts`) — Structured JSON logger with levels (trace/debug/info/warn/error/fatal), child loggers with context, and pluggable destinations (console, file, telemetry stream).

Extracting these into `@gobing-ai/ts-infra` provides the application backbone that any Spur-based app can use, while keeping each subsystem independently importable.


### Requirements

- [ ] Package published to npm as `@gobing-ai/ts-infra` (public, scoped)
- [ ] Internal dependencies: `@gobing-ai/ts-runtime` (for `RuntimeContext`, `FileSystem`, `ProcessExecutor`), `@gobing-ai/ts-db` (for `DbAdapter`, `QueueJobDao`, `SpanContext`)
- [ ] External dependencies: `@opentelemetry/api` (peer, for telemetry), OpenTelemetry SDK/exporter packages used by `telemetry/sdk.ts`, `node-cron` (optional peer or runtime dependency for Node scheduler), `zod` only if the generic API client keeps schema validation
- [ ] ESM only (`"type": "module"`)
- [ ] Exports from barrel:
  - **EventBus** — `EventBus`, `EventContext`, `EventObserver`, default observer helpers, file observer helpers, `createSystemBus`
  - **Events** — generic event map/factory pattern; Spur-specific `AppEvents` and default responses live under `examples/spur/` unless intentionally kept as examples
  - **JobQueue** — source-compatible names (`DBJobQueue`, `DBQueueConsumer`) or renamed aliases (`DbQueue`, `DbConsumer`) with explicit compatibility exports, `JobRecord`, `JobStatus`, `JobHandler`, `QueueConfig`
  - **Scheduler** — source-compatible names (`SchedulerAdapter`, `NodeSchedulerAdapter`, `CloudflareSchedulerAdapter`, `NoOpSchedulerAdapter`, `initScheduler`, `SchedulerAction`) or renamed aliases with explicit compatibility exports
  - **Telemetry** — source-compatible functions (`initTelemetry`, `shutdownTelemetry`, `getTracer`, tracing helpers, metrics helpers, `TelemetryConfig`, `sanitizeSql`)
  - **ApiClient** — source-compatible `APIClient`, `APIClientConfig`, `APIError`, typed request/response helpers
  - **Logger** — either keep the source LogTape wrapper (`getLogger`, `initializeLogger`, `Logger` type) and declare `@logtape/logtape`, or replace with a new structured logger and update tests/imports accordingly
- [ ] Tests ≥ 90% coverage per file
- [ ] Biome + tsc clean


### Q&A



### Design



### Solution

Extract from `~/xprojects/spur/packages/core/src/`:

| spur source | ts-libs target | Notes |
|---|---|---|
| `event-bus/event-bus.ts` | `src/event-bus/event-bus.ts` | Core typed EventBus |
| `event-bus/types.ts` | `src/event-bus/types.ts` | EventContext, EventObserver, event maps |
| `event-bus/default-observers.ts` | `src/event-bus/default-observers.ts` | Built-in observers |
| `event-bus/file-observer.ts` | `src/event-bus/file-observer.ts` | File watcher observer |
| `event-bus/index.ts` | merged into `src/event-bus/` barrel | |
| `events/app-events.ts` | `src/events/app-events.ts` | AppEvents type map |
| `events/create-system-bus.ts` | `src/events/create-system-bus.ts` | Factory function |
| `events/default-responses.ts` | `src/events/default-responses.ts` | Default event handlers |
| `events/index.ts` | merged into `src/events/` barrel | |
| `job-queue/db-queue.ts` | `src/job-queue/db-queue.ts` | DB-backed queue |
| `job-queue/db-consumer.ts` | `src/job-queue/db-consumer.ts` | Consumer/worker |
| `job-queue/types.ts` | `src/job-queue/types.ts` | JobRecord, JobStatus, config types |
| `job-queue/index.ts` | merged into `src/job-queue/` barrel | |
| `scheduler/action.ts` | `src/scheduler/action.ts` | ScheduledAction type |
| `scheduler/types.ts` | `src/scheduler/types.ts` | Scheduler interface |
| `scheduler/factory.ts` | `src/scheduler/factory.ts` | SchedulerFactory |
| `scheduler/node.ts` | `src/scheduler/node.ts` | NodeScheduler (node-cron) |
| `scheduler/cloudflare.ts` | `src/scheduler/cloudflare.ts` | CloudflareScheduler (CF triggers) |
| `scheduler/noop.ts` | `src/scheduler/noop.ts` | NoopScheduler (test) |
| `scheduler/wrap-handler.ts` | `src/scheduler/wrap-handler.ts` | Handler wrapper with error boundary |
| `scheduler/index.ts` | merged into `src/scheduler/` barrel | |
| `telemetry/sdk.ts` | `src/telemetry/sdk.ts` | OTel SDK initialization |
| `telemetry/tracing.ts` | `src/telemetry/tracing.ts` | Span management helpers |
| `telemetry/metrics.ts` | `src/telemetry/metrics.ts` | Counter, histogram, gauge |
| `telemetry/config.ts` | `src/telemetry/config.ts` | TelemetryConfig type |
| `telemetry/db-sanitize.ts` | `src/telemetry/db-sanitize.ts` | SQL query scrubber |
| `telemetry/index.ts` | merged into `src/telemetry/` barrel | |
| `api-client.ts` | `src/api-client.ts` | Typed HTTP client |
| `logger.ts` | `src/logger.ts` | Structured logger |

**Adaptations:**
- Replace `@starter/core` imports with `@gobing-ai/ts-runtime`, `@gobing-ai/ts-db`, or `@gobing-ai/ts-utils`
- `event-bus`: remove Spur-specific event types; define a generic `EventMap` parameterized interface that apps extend
- `events/app-events.ts`: this is Spur-specific. Extract the pattern (typed event map + factory) but move Spur's actual events to a `spur-events.ts` example or leave them in spur
- `job-queue/db-queue.ts`: depends on `QueueJobDao` from `@gobing-ai/ts-db` and `RuntimeContext` from `@gobing-ai/ts-runtime` — verify interface compatibility
- `scheduler/cloudflare.ts`: remove `@cloudflare/workers-types`; use minimal local type declaration (same pattern as ts-runtime)
- `telemetry/sdk.ts`: replace spur-specific exporter config with generic `TelemetryConfig`; apps provide their own exporter setup
- `api-client.ts`: remove spur-specific endpoint definitions; keep the generic client builder
- `api-client.ts`: currently imports OpenTelemetry semantic conventions; either keep the dependency explicitly or remove tracing instrumentation from the generic client and let callers wrap requests
- `logger.ts`: source uses `@logtape/logtape`; either keep it as an explicit dependency/peer and document that API, or replace the implementation with an in-package JSON logger. Do not leave an undeclared dependency.
- Internal imports must use `.js` specifiers


### Plan

1. Scaffold `packages/infra/` with package.json, tsconfig.json, src/index.ts barrel (depends on `@gobing-ai/ts-runtime` + `@gobing-ai/ts-db`)
2. Extract `event-bus/` subsystem — EventBus class, types, default observers, file observer
3. Extract `events/` subsystem — typed event maps, system bus factory, default responses
4. Extract `job-queue/` subsystem — DbQueue (depends on QueueJobDao from ts-db), DbConsumer, types
5. Extract `scheduler/` subsystem — interface, factory, Node/CF/Noop adapters
6. Extract `telemetry/` subsystem — SDK, tracing, metrics, config, DB sanitizer
7. Extract `api-client.ts` + `logger.ts` — typed HTTP client and structured logger
8. Copy and adapt tests for each subsystem; replace vitest with bun:test
9. Run package-level `bun run lint`, `bun run typecheck`, and `bun run test`; from the repo root also run `bun run check` if task 0017 created it
10. Mark task done


### Review



### Testing



### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References
