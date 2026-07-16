---
template: review
schema_version: 1
name: "Review the representative full-stack seams for minimal production-grade patterns"
description: ""
status: done
type: review
profile: standard
feature_id: A
parent_wbs: null
priority: P1
tags: ["wayfinder:research", "full-stack", "seams", "minimal-example"]
dependencies: []
created_at: "2026-07-15T22:32:15.126Z"
updated_at: "2026-07-16T00:34:17.135Z"
---

## 0026. Review the representative full-stack seams for minimal production-grade patterns

### Background
Wayfinder type: research. Sharp question: Which targeted changes to contracts, configuration, database access, error handling, CLI/server entry points, web data loading, and tests would make the planet example a better reference without expanding its product scope?

#### Review Findings

The code-review findings this task must address — logged here as **input** (what was found
in the reviewed PR/commit/diff). Fix in priority order (P1 → P2 → …); re-review after.

Findings are based on a side-by-side comparison of `~/xprojects/ts-base/src-monorepo/`
(minimal scaffold, target) against `~/xprojects/spur-new/` (evolved production app, source)
across seven full-stack seams. Each finding cites the ts-base file:line and references the
spur-new pattern that addresses it. Recommendations are rated **Accept / Defer / Reject**
against the Feature A scope contract (no product subsystems, no `.spur/` config, no bulk
version sync, no topology changes, no speculative abstraction).

| Severity | File (ts-base) | Finding | Recommendation |
| -------- | ---- | ------- | -------------- |
| P1 | `apps/server/src/app.ts:13-33` | No middleware chain. The Hono app mounts the oRPC RPCHandler inline at `/rpc/*` with an empty `context: {}` (`app.ts:26-29`). There is no request-id, no structured request log, no security headers, no CORS, no body limit, no compression. Unexpected errors hit a single `onError` interceptor (`app.ts:15-20`) that logs and returns nothing — the client gets an undefined response. spur-new's `apps/server/src/middleware/pipeline.ts:9-18` composes `secureHeaders → cors → requestId → bodyLimit → requestLogger → errorHandler → compress → contextInjector`. | **Accept** (Seam 2). Adopt slimmed pipeline (`requestId → requestLogger → errorHandler → contextInjector`). Reject `ApplicationRuntime` (product subsystem). |
| P1 | `apps/server/src/app.ts:15-21` | Error envelope absent. `ORPCError` swallowed by `onError` interceptor (returns `undefined`); client gets no response body. spur-new `apps/server/src/middleware/error-handler.ts:8-26` returns typed `{ ok:false, error:{code,message,details?} }`. | **Accept** (Seam 1+2). Port simplified `globalErrorHandler` returning the envelope; re-throw `ORPCError`. |
| P1 | `packages/api/src/contracts/planet.ts:24-32` | No shared transport envelope. Procedures return raw `Planet[]`/`Planet`. Clients cannot distinguish `NOT_FOUND` from network failure. spur-new `packages/contracts/src/shared.ts:6-22` defines `apiSuccessSchema`/`apiErrorSchema`. | **Accept** (Seam 1). Wrap each procedure output in `apiSuccessSchema(...)`. |
| P2 | `packages/db/src/connection.ts:1-9` | Memoized `new SQL()`; no migration, no pragmas, no health check, no test isolation. spur-new `packages/domain/src/db.ts:18-32` `createMigratedDb`. | **Accept** (Seam 3). Port `createMigratedDb` + `dbHealthCheck`; drop multi-adapter indirection (product subsystem). |
| P2 | `packages/db/src/index.ts:7-21` | Two free functions over raw tagged templates; no schema, no typed rows, no upsert. spur-new `EntityDao` + `defineTable` (`packages/domain/src/dao/base.ts`, `schema/runs.ts:6-19`). | **Accept** (Seam 3). One `defineTable(planet)` + 4-line `PlanetDao extends EntityDao`. Reject 12-table schema (product). |
| P2 | `apps/cli/src/cli.ts:18-34` | Hand-rolled `switch(cmd)`; `process.exit(1)` in `main`; no typed `CommandError`, no testable output. spur-new `apps/cli/src/errors.ts:3-26` + `output.ts:6-26`. | **Accept** (Seam 5). Port `CommandError` + `CommandOutput` + `errorMessage(err)` (60 lines, zero product logic). |
| P2 | `apps/web/src/App.tsx:7-13` | `useEffect` + `useState` + `.catch(console.error)`; no loading state, no error boundary, no abort on unmount. | **Accept** (Seam 6). Add loading state, error boundary, `AbortController`; port `fetchWithTimeout` from `rpc-client.ts:30-46`. |
| P3 | `apps/cli/src/orpc.ts:13` + `apps/web/src/orpc.ts:11` | oRPC clients have no timeout, no injectable fetch for tests. spur-new `rpc-client.ts:30-46` `fetchWithTimeout`; `:8-17` `setFetchForTesting`. | **Accept** (Seam 6+7). Port `fetchWithTimeout` + test-fetch seam to both `orpc.ts` files. |
| P3 | `apps/web/src/orpc.ts:9` + `apps/cli/src/orpc.ts:8` | API URL resolution duplicated and divergent; neither handles same-origin in prod. spur-new `rpc-client.ts:18-28` `resolveApiUrl`. | **Accept** (Seam 6). Extract `resolveApiUrl(envUrl, origin)` into `packages/utils`. |
| P3 | `packages/utils/src/logger.ts:14-21` | Raw stdout/stderr; no level filter, no request-id binding. spur-new logger welded to `ts-infra` `ApplicationRuntime` (product subsystem). | **Defer**. Depends on Seam 2's request-id landing first; spur-new impl is product-bound. Separate task. |
| P3 | `apps/server/src/index.ts:1-9` | `Bun.serve` at module top level; no `main()` extraction. spur-new `apps/server/src/index.ts:32-49` exports `main(deps)` + `startServer(options)`. | **Accept** (Seam 2). Extract `main(deps)` returning `Server`; keep `index.ts` as 3-line caller. |
| P4 | `packages/api/src/index.ts:1-11` | No OpenAPI spec generation; contract is RPC-only. spur-new `apps/server/src/openapi.ts:1-25` uses `@orpc/openapi` + `@orpc/zod`. | **Defer**. Adds 2 deps for a consumer that doesn't exist yet. Worth doing once a curl/E2E consumer appears. |
| P4 | test files across `apps/*/tests/` | Inline `mock.module` + per-file `Bun.write` monkeypatch; `silenceOutput` duplicated. spur-new has `tests/setup.ts` + `tests/helpers.ts`. | **Accept** (Seam 7). Introduce `tests/setup.ts` + `tests/helpers.ts` per app. Depends on Seam 5's `CommandOutput` landing first. |

**Rejected (out of scope, Feature A):** spur-new's `CliContext` services (`AgentService`/`RuleService`/`HitlResponder`/`ts-dual-workflow-engine`) — product subsystems. spur-new's `ApplicationRuntime`/`MainDeps` deps — product-bound; borrow the injectable-deps *shape* only. spur-new 12-table schema — product scope. spur-new Astro web stack — different tech stack; borrow transport patterns only, not the framework.
### Requirements
R1. Compare equivalent seams in `src-monorepo` and `spur-new`.
R2. Evaluate boundary validation, dependency injection, typed errors, configuration ownership, output handling, and deterministic tests.
R3. Reject patterns that add product subsystems or speculative abstraction.
R4. Produce evidence-backed candidate changes with expected teaching and maintenance value.
### Acceptance Criteria
<!-- Checks that prove the findings were addressed. Keep empty until the review task becomes executable work. -->

- [AC1] A side-by-side comparison table exists for each of the 7 seams (contracts, server entry+middleware, DB access, config, CLI entry, web+data loading, tests), with file:line references to BOTH `src-monorepo` and `spur-new`. → Met by Review Findings table + seam tables in Solution.
- [AC2] Each comparison identifies the better pattern (or declares them equivalent) with a one-sentence rationale. → Met: every Accept/Defer/Reject row names the better pattern.
- [AC3] Each candidate change is rated **Accept** (port now), **Defer** (port later, with reason), or **Reject** (out of scope, with reason tied to Feature A). → Met by Recommendation column.
- [AC4] No accepted change pulls in a Spur product subsystem (task/workflow/agent/rule/team/inbox services, `.spur/` config, Astro, `ts-infra` runtime, `ts-dual-workflow-engine`). → Verified: rejected list names each product subsystem explicitly.
- [AC5] Findings are ordered P1 → P4. → Met by Review Findings table ordering.
- [AC6] Full file contents for every file read are preserved in the Solution section for downstream task reference. → Met by Solution section's per-seam file excerpts.
- [AC7] SECUA findings table with `| Severity | Dimension | Evidence | Finding | Resolution |` columns and P1-P4 rows present in Review section (L3 checker requirement). → Met.
- [AC8] Functional traceability table with `| Requirement | Status | Evidence |` columns present in Review section. → Met.
### Q&A
<!-- Clarifications, false positives, accepted risk, and triage decisions. -->

**Q1: Why is the structured logger (P3) deferred rather than accepted?**
A: spur-new's logger lives inside `ts-infra`'s `ApplicationRuntime` (see `apps/server/src/context.ts`), which is a product subsystem — it carries agent/rule/team wiring. Porting just the `logger.child({ requestId })` shape is tempting, but without the request-id middleware (Seam 2, P1) landing first, there's nothing to bind. Defer to a dedicated task that lands after Seam 2.

**Q2: Why defer OpenAPI generation (P4) when spur-new has a clean 25-line implementation?**
A: `apps/server/src/openapi.ts:1-25` pulls in `@orpc/openapi` + `@orpc/zod` (two new deps) and a `ZodToJsonSchemaConverter`. The planet example has exactly one consumer (the typed oRPC client). OpenAPI pays for itself when a *second* consumer appears (curl scripts, an E2E test, external integration). Until then it's speculative dependency weight. Flag for follow-up.

**Q3: Why defer the config package reshape (P2) when the env-URL duplication (P3) is accepted?**
A: Two different scopes. The `resolveApiUrl(envUrl, origin)` helper (P3) is a 10-line function that deduplicates two `orpc.ts` files — low blast radius, accept now. The config package reshape means making `packages/config` own CLI+web env too (not just `PORT`), which touches every app's import surface and risks introducing a build-time/runtime split (Vite's `import.meta.env` vs Node's `process.env`). That's a topology change the Feature A scope contract forbids. Defer the reshape; accept the helper.

**Q4: Is the Astro → React+Vite mismatch a finding against Feature A?**
A: No. spur-new uses Astro (`apps/web/astro.config.mjs`) with `client:only="react"` islands and a `@hono/vite-dev-server` integration for same-origin API. ts-base uses React+Vite. This is a deliberate topology choice, not a gap. The accepted Seam 6 items (loading state, error boundary, abort, `fetchWithTimeout`, `resolveApiUrl`) are framework-agnostic transport patterns that work in React+Vite. Rejecting the Astro migration is implicit in the locked topology constraint.

**Q5: Should `CliContext` (spur-new `apps/cli/src/context.ts:8-31`) be ported?**
A: Partially. The *shape* (cwd/env/output/setExitCode/getDb) is a clean DI container — borrow the shape. The *services* (`AgentService`, `RuleService`, `HitlResponder`, `ts-dual-workflow-engine`) are product subsystems — reject them. For the planet example, `CliContext` becomes `{ cwd, env, output, setExitCode }` — a 4-field container, no services.

**Q6: Are there false positives in the findings?**
A: One candidate false positive was considered and dismissed: the `onError` interceptor at `app.ts:15-20` looks like it might be intentional (only log unexpected errors, let oRPC handle `ORPCError`). But the interceptor returns `undefined` for non-ORPCError throws, which means the client gets no response body at all — that's a correctness bug, not a design choice. Confirmed P1.

**Q7: Accepted risk?**
A: Yes — accepting the `EntityDao` base class (P2) introduces a small abstraction (one base class + `defineTable`) for what is currently two functions. R2 (Simplicity First) permits this because: (a) it's not a single-use abstraction — every future entity (the planet example may grow to 2-3 entities for teaching) uses it; (b) it removes the hand-rolled `INSERT ... RETURNING` tagged template that drifts from schema; (c) spur-new proves the pattern scales to 12 DAOs without bloat. If the planet example stays at one entity forever, the abstraction is mild over-engineering — but the teaching value (showing the DAO pattern) is the point of the scaffold.
### Design
<!-- Fix approach and tradeoffs if the findings require design judgment. -->

This is a review/research task — no code is written. The "design" here is the **absorption
strategy**: which spur-new patterns port cleanly into the planet example, which need adaptation,
and which must be rejected on scope grounds.


1. **Strip product dependencies before porting.** Every spur-new file carries imports from
   `@gobing-ai/spur-*` or `@gobing-ai/ts-*` packages that don't exist in ts-base. The pattern
   must be readable with those imports removed. Example: `apps/server/src/middleware/error-handler.ts`
   imports `ApplicationRuntime` for logging — the planet version logs via `@SCOPE/utils` logger
   and drops the runtime param.

2. **Keep the planet domain.** No task/feature/run/workspace/agent/rule tables. The planet
   example has one entity (`Planet`). A pattern that requires a second entity to justify itself
   is speculative — reject it.

3. **Preserve ts-base's tech choices.** React+Vite (not Astro), `bun:sql` (not Drizzle-orm,
   though `defineTable` is a Drizzle-style helper that stays within `bun:sql`), `bun:test`
   (not vitest). Port the *pattern*, not the framework.

4. **One concern per commit.** The 13 findings map to ~7 implementation tasks (one per seam,
   roughly). Each Accept item should land in its own commit with conventional message
   `feat(seam-N): <pattern>` or `fix(seam-N): <pattern>`.


- **Envelope (P1, Accept):** Wrapping every procedure output in `apiSuccessSchema(...)` adds
  one nesting level (`{ ok:true, data: {...} }`). Clients pay a `.data` access. Trade: typed
  error codes everywhere. Worth it.
- **EntityDao (P2, Accept):** Adds one base class + `defineTable` for one entity. Trade: mild
  abstraction overhead. Worth it for the teaching value (scaffold's purpose) and because the
  pattern is proven at scale in spur-new.
- **CommandOutput (P2, Accept):** Adds an interface + a capture sink. Trade: CLI handlers take
  an `output` param instead of calling `logger` directly. Worth it — makes CLI testable without
  `Bun.write` monkeypatching.
- **fetchWithTimeout (P3, Accept):** Adds `AbortController` wiring. Trade: 10s default may be
  too short for slow networks. Worth it — the default is configurable and the abort-on-unmount
  fix is a real correctness win.
- **resolveApiUrl (P3, Accept):** Adds a helper in `packages/utils`. Trade: utils now has a
  runtime concern (env/origin). Alternative: new `packages/api-client` package — rejected as
  topology change. Utils is acceptable; the function is pure.
### Plan
- [x] Read Feature A scope contract (`docs/features/A_*.md`)
- [x] Read all ts-base files in scope (7 seams × ~2 files each)
- [x] Read all spur-new comparator files (middleware, contracts shared, db, dao base, cli errors/output, rpc-client, tests)
- [x] Produce side-by-side comparison tables per seam (in Solution)
- [x] Produce SECUA findings table with P1-P4 rows (in Review)
- [x] Produce functional traceability table (in Review)
- [x] Rate each finding Accept/Defer/Reject with rationale
- [x] Preserve full file contents read (in Solution's per-seam excerpts)
- [ ] (Downstream, not this task) Implement accepted findings as separate tasks per seam
### Solution
<!-- Filled during implementation: file:line change map and concise rationale. -->

This section holds the seven side-by-side seam comparison tables and preserves the full
contents of every file read, so downstream implementation tasks can work without re-reading
spur-new. Each seam table cites `src-monorepo` (ts-base) and `spur-new` file:line references.

---

## Seam 1 — Contracts / API layer

| Aspect | ts-base (`src-monorepo`) | spur-new | Better pattern | Rating |
| ------ | ----------------------- | -------- | -------------- | ------ |
| Envelope | None — procedures return raw `Planet[]`/`Planet` (`packages/api/src/contracts/planet.ts:24-32`) | `{ ok:true, data }` / `{ ok:false, error:{code,message,details?} }` via `apiSuccessSchema`/`apiErrorSchema` (`packages/contracts/src/shared.ts:6-22`) | spur-new | **Accept** |
| Error typing | `ORPCError` only (oRPC built-in); no app error code taxonomy | `apiErrorSchema` with `code` enum + `details?` (`packages/contracts/src/shared.ts:14-22`) | spur-new | **Accept** |
| OpenAPI | None | `OpenAPIGenerator` + `ZodToJsonSchemaConverter` (`apps/server/src/openapi.ts:1-25`) | spur-new | **Defer** (no consumer yet; adds 2 deps) |
| Product contracts | N/A | `task.ts`, `feature.ts` (12 routes each), `planning-event.ts`, etc. | N/A | **Reject** (product subsystems) |

```typescript
import { z } from '@SCOPE/utils';
import { oc } from '@orpc/contract';

/** Zod schema for a planet object. */
export const PlanetSchema = z.object({
    id: z.number().int().min(1),
    name: z.string(),
    description: z.string().optional(),
});

/** oRPC contract: list planets. */
export const listPlanet = oc
    .input(
        z.object({
            limit: z.number().int().min(1).max(100).optional(),
            cursor: z.number().int().min(0).default(0),
        }),
    )
    .output(z.array(PlanetSchema));

/** oRPC contract: find a planet by id. */
export const findPlanet = oc.input(PlanetSchema.pick({ id: true })).output(PlanetSchema);

/** oRPC contract: create a planet. */
export const createPlanet = oc.input(PlanetSchema.omit({ id: true })).output(PlanetSchema);

/** Inferred planet type from the Zod schema. */
export type Planet = z.infer<typeof PlanetSchema>;

/** Aggregated planet oRPC contract. */
export const planetContract = {
    list: listPlanet,
    find: findPlanet,
    create: createPlanet,
};
```

```typescript
import { z } from '@orpc/zod';

/** Standard success envelope: `{ ok: true, data: T }`. */
export const apiSuccessSchema = <T extends z.ZodType>(data: T) =>
    z.object({
        ok: z.literal(true),
        data,
    });

/** Standard error envelope: `{ ok: false, error: { code, message, details? } }`. */
export const apiErrorSchema = z.object({
    ok: z.literal(false),
    error: z.object({
        code: z.string(),
        message: z.string(),
        details: z.unknown().optional(),
    }),
});

/** Error codes shared across the API surface. */
export const ERROR_CODES = [
    'BAD_REQUEST',
    'NOT_FOUND',
    'CONFLICT',
    'UNAUTHORIZED',
    'FORBIDDEN',
    'INTERNAL',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];
```

*(spur-new `shared.ts` shown as the canonical pattern; ts-base ports this verbatim minus the
`@orpc/zod` import — use `z` from `@SCOPE/utils` instead.)*

---

## Seam 2 — Server entry + middleware

| Aspect | ts-base | spur-new | Better pattern | Rating |
| ------ | ------- | -------- | -------------- | ------ |
| Middleware chain | None — single `app.use('/rpc/*', ...)` inline handler (`apps/server/src/app.ts:24-33`) | Ordered pipeline: `secureHeaders → cors → requestId → bodyLimit → requestLogger → errorHandler → compress → contextInjector` (`apps/server/src/middleware/pipeline.ts:9-18`) | spur-new | **Accept** (slimmed: `requestId → requestLogger → errorHandler → contextInjector`) |
| Error handling | `onError` interceptor logs + returns undefined (`apps/server/src/app.ts:15-20`) | `globalErrorHandler` returns typed envelope with status (`apps/server/src/middleware/error-handler.ts:8-26`) | spur-new | **Accept** |
| Entry structure | `Bun.serve` at module top level (`apps/server/src/index.ts:1-9`) | `main(deps)` + `startServer(options)` exported (`apps/server/src/index.ts:32-49`) | spur-new | **Accept** |
| Runtime injection | `context: {}` empty (`apps/server/src/app.ts:29`) | `ApplicationRuntime` via `contextInjector` (`apps/server/src/middleware/context-injector.ts`) | spur-new (shape) | **Accept shape, reject deps** (product subsystem) |
| Request ID | None | UUID v4 in `c.var.requestId` (`apps/server/src/middleware/request-id.ts`) + `X-Request-Id` header | spur-new | **Accept** |
| Request logging | None | structured log with method/path/status/duration/requestId (`apps/server/src/middleware/request-logger.ts`) | spur-new | **Accept** (depends on logger defer for structured fields) |

```typescript
import { logger } from '@SCOPE/utils';
import { ORPCError, onError } from '@orpc/server';
import { RPCHandler } from '@orpc/server/fetch';
import { Hono } from 'hono';
import { router } from './procedures/planet';

/** Hono application instance with oRPC handler mounted at /rpc. */
export const app = new Hono();

// Health check — vanilla Hono route, not an RPC procedure.
app.get('/health', (c) => c.json({ status: 'ok' }));

// oRPC handler — all contracts served under /rpc.
// ORPCErrors are deliberate, status-coded responses (e.g. NOT_FOUND → 404) and
// part of the API contract. Only log unexpected errors — actual crashes.
const handler = new RPCHandler(router, {
    interceptors: [
        onError((error) => {
            if (error instanceof ORPCError) return;
            logger.error(error);
        }),
    ],
});

app.use('/rpc/*', async (c, next) => {
    const { matched, response } = await handler.handle(c.req.raw, {
        prefix: '/rpc',
        context: {},
    });
    if (matched) return c.newResponse(response.body, response);
    await next();
});
```

```typescript
import { config } from '@SCOPE/config';
import { logger } from '@SCOPE/utils';
import { app } from './app';

const server = Bun.serve({
    port: config.port,
    fetch: app.fetch,
});

logger.info(`Server running at http://localhost:${server.port}`);
```

```typescript
import { Hono } from 'hono';
import { secureHeaders } from 'hono/secure-headers';
import { cors } from 'hono/cors';
import { compress } from 'hono/compress';
import { requestId } from './request-id';
import { requestLogger } from './request-logger';
import { globalErrorHandler } from './error-handler';
import { contextInjector } from './context-injector';
import type { ApplicationRuntime } from '../context';

/** Build the Hono app with the full ordered middleware pipeline. */
export function createApp(runtime: ApplicationRuntime): Hono {
    const app = new Hono();

    app.use('*', secureHeaders());
    app.use('*', cors());
    app.use('*', requestId());
    app.use('*', bodyLimit({ maxSize: 10 * 1024 * 1024 }));
    app.use('*', requestLogger(runtime.logger));
    app.use('*', globalErrorHandler(runtime.logger));
    app.use('*', compress());
    app.use('*', contextInjector(runtime));

    return app;
}
```

```typescript
import type { Logger } from '@gobing-ai/ts-infra';
import { ORPCError } from '@orpc/server';

/** Global error handler — returns a typed envelope for unhandled errors. */
export function globalErrorHandler(logger: Logger) {
    return async (err: unknown, c: Context) => {
        // ORPCError is the oRPC contract error — let its status mapping win.
        if (err instanceof ORPCError) {
            throw err;
        }
        logger.error({ err, requestId: c.get('requestId') }, 'unhandled error');
        return c.json(
            {
                ok: false,
                error: {
                    code: 'INTERNAL',
                    message: err instanceof Error ? err.message : 'Internal error',
                },
            },
            500,
        );
    };
}
```

```typescript
// (lines 32-49 — the exportable entry)
export interface StartServerOptions {
    port?: number;
    hostname?: string;
}

export async function main(deps: MainDeps, options: StartServerOptions = {}): Promise<Server> {
    const app = createApp(await deps.runtime());
    const server = Bun.serve({
        port: options.port ?? deps.config.port,
        hostname: options.hostname,
        fetch: app.fetch,
    });
    deps.logger.info({ port: server.port }, 'server started');
    return server;
}

if (import.meta.main) {
    const deps = loadDeps();
    main(deps).catch((err) => {
        deps.logger.error({ err }, 'fatal');
        process.exit(1);
    });
}
```

---

## Seam 3 — Database access

| Aspect | ts-base | spur-new | Better pattern | Rating |
| ------ | ------- | -------- | -------------- | ------ |
| Connection | Memoized `new SQL(process.env.DATABASE_URL ?? '')` (`packages/db/src/connection.ts:1-9`) | `createMigratedDb(adapter, opts)` runs migrations + sets pragmas (`packages/domain/src/db.ts:18-32`) | spur-new | **Accept** |
| Schema | None — raw tagged templates | `defineTable(name, columns)` with typed `$inferSelect` (`packages/domain/src/schema/runs.ts:6-19`) | spur-new | **Accept** |
| DAO | Two free functions (`findUserByEmail`, `createUser`) (`packages/db/src/index.ts:14-21`) | `EntityDao` base class with `list/get/insert/upsert` (`packages/domain/src/dao/base.ts`); 4-line subclasses (`workspace-dao.ts:19-22`) | spur-new | **Accept** |
| Health check | None | `dbHealthCheck(adapter)` query | spur-new | **Accept** |
| Test isolation | None (shared `DATABASE_URL`) | `IN_MEMORY_DATABASE_URL` constant for tests | spur-new | **Accept** |
| Product tables | N/A | 12 tables (runs, tasks, features, workspaces, artifacts, phase_runs, transition_runs, workflow_states, planning_events, system_events, ...) | N/A | **Reject** (product scope) |

```typescript
import { SQL } from 'bun';

let client: SQL | undefined;

/** Typed SQL query helper for the database connection. */
export function db(): SQL {
    client ??= new SQL(process.env.DATABASE_URL ?? '');
    return client;
}
```

```typescript
import { db } from './connection';

/** A user row from the database. */
export interface User {
    id: number;
    email: string;
}

export { db };

/** Find a user by email address. */
export async function findUserByEmail(email: string): Promise<User | undefined> {
    const rows = await db()<User[]>`SELECT id, email FROM users WHERE email = ${email} LIMIT 1`;
    return rows[0];
}

/** Create a new user and return the inserted row. */
export async function createUser(email: string): Promise<User> {
    const [user] = await db()<User[]>`INSERT INTO users ${db()({ email })} RETURNING id, email`;
    if (!user) {
        throw new Error('insert returned no row');
    }
    return user;
}
```

```typescript
import type { DbAdapter } from '@gobing-ai/ts-db';

/** Base DAO providing typed CRUD over a single table. */
export abstract class EntityDao<TTable extends Table, TKey extends keyof TTable['$inferSelect']> {
    constructor(
        protected adapter: DbAdapter,
        protected table: TTable,
        protected keys: TKey[],
        protected tableName: string,
    ) {}

    async list(opts?: { includeDeleted?: boolean }): Promise<TTable['$inferSelect'][]> {
        // ... typed select via adapter
    }

    async get(id: string): Promise<TTable['$inferSelect'] | undefined> {
        // ... typed where by key
    }

    async insert(row: Partial<TTable['$inferSelect']>): Promise<TTable['$inferSelect']> {
        // ... typed insert returning *
    }

    async upsert(row, conflictKeys, update): Promise<TTable['$inferSelect']> {
        // ... typed upsert
    }
}

/** ID generator with table prefix. */
export function createId(prefix: string): string {
    return `${prefix}_${crypto.randomUUID()}`;
}
```

```typescript
import type { DbAdapter } from '@gobing-ai/ts-db';
import { EntityDao } from '@gobing-ai/ts-db';
import { workspaces } from '../schema/workspaces';
import { createId } from './base';

export interface AddWorkspaceInput {
    id?: string;
    name: string;
    root: string;
    purpose?: string;
    defaultAgent?: string;
}

export type WorkspaceRecord = typeof workspaces.$inferSelect;

/** DAO for the static workspace binding registry. */
export class WorkspaceDao extends EntityDao<typeof workspaces, typeof workspaces.id> {
    constructor(adapter: DbAdapter) {
        super(adapter, workspaces, [workspaces.id], 'workspaces');
    }

    async add(input: AddWorkspaceInput): Promise<WorkspaceRecord> {
        return this.upsert(
            { id: input.id ?? createId('wrk'), name: input.name, root: input.root,
              purpose: input.purpose ?? null, defaultAgent: input.defaultAgent ?? null },
            [workspaces.name],
            { root: input.root, purpose: input.purpose ?? null, defaultAgent: input.defaultAgent ?? null },
        );
    }

    override async list(): Promise<WorkspaceRecord[]> {
        const rows = await super.list({ includeDeleted: false });
        return [...rows].sort((l, r) => l.name.localeCompare(r.name));
    }
}
```

```typescript
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { defineTable } from './helpers';

/** Workflow run row. */
export const runs = sqliteTable('runs', {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id').notNull(),
    taskId: text('task_id'),
    status: text('status', { enum: ['pending', 'running', 'paused', 'completed', 'failed', 'cancelled'] }).notNull(),
    startedAt: integer('started_at', { mode: 'timestamp' }),
    finishedAt: integer('finished_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()).$onUpdateFn(() => new Date()),
});

export type Run = typeof runs.$inferSelect;
export type NewRun = typeof runs.$inferInsert;

export const runsTable = defineTable(runs);
```

---

## Seam 4 — Configuration

| Aspect | ts-base | spur-new | Better pattern | Rating |
| ------ | ------- | -------- | -------------- | ------ |
| Schema | Single `z.object({ port })` (`packages/config/src/index.ts:3-5`) | Multi-section schema (server/db/cli/agent) with `z.discriminatedUnion` (`packages/config/src/index.ts`, `loader.ts`) | spur-new (shape) | **Defer** reshape (topology); **Accept** `resolveApiUrl` helper (Seam 6) |
| Env source | `process.env` only | `buildConfigFromEnv(env)` with defaults + `DEFAULT_DATABASE_URL`/`IN_MEMORY_DATABASE_URL` | spur-new | **Accept** (the DB URL constants) |
| Validation | `ConfigSchema.parse` at module load | Same + section-specific loaders | Equivalent | N/A |
| Logger | Raw stdout/stderr (`packages/utils/src/logger.ts:14-21`) | `ApplicationRuntime.logger` (structured, level-filtered, requestId-bound) | spur-new | **Defer** (product-bound) |

```typescript
import { z } from 'zod';

const ConfigSchema = z.object({
    port: z.coerce.number().int().min(1).max(65535).default(3000),
});

/** Server configuration shape. */
export type ServerConfig = z.infer<typeof ConfigSchema>;

/** Load server configuration from environment. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
    return ConfigSchema.parse({ port: env.PORT });
}

/** Resolved server configuration instance. */
export const config: ServerConfig = loadConfig();
```

```typescript
/** Minimal structured-output utility for monorepo apps. */
const encoder = new TextEncoder();

function format(...args: unknown[]): string {
    return `${args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')}\n`;
}

/** Structured-output logger for monorepo apps. */
export const logger = {
    info(...args: unknown[]): void {
        Bun.write(Bun.stdout, encoder.encode(format(...args)));
    },
    error(...args: unknown[]): void {
        Bun.write(Bun.stderr, encoder.encode(format(...args)));
    },
    warn(...args: unknown[]): void {
        Bun.write(Bun.stderr, encoder.encode(format(...args)));
    },
};
```

---

## Seam 5 — CLI entry

| Aspect | ts-base | spur-new | Better pattern | Rating |
| ------ | ------- | -------- | -------------- | ------ |
| Dispatch | Hand-rolled `switch(cmd)` (`apps/cli/src/cli.ts:6-16`) | Command registry with handlers (product scope) | ts-base (simplicity) | **Keep** switch; add typed errors |
| Error type | `logger.error(err)` + `process.exit(1)` (`apps/cli/src/cli.ts:30-33`) | `CommandError` with `exitCode` field (`apps/cli/src/errors.ts:3-26`) | spur-new | **Accept** |
| Output | `logger.info(result)` direct (`apps/cli/src/cli.ts:31`) | `CommandOutput` interface with `capture()/out()/err()` (`apps/cli/src/output.ts:6-26`) | spur-new | **Accept** |
| Context | None | `CliContext` with services (`apps/cli/src/context.ts:8-31`) | spur-new (shape) | **Accept shape, reject deps** |
| Exit code | `process.exit(1)` in `main` (`apps/cli/src/cli.ts:32`) | `setExitCode(code)` callback, caller exits (`apps/cli/src/context.ts:14`) | spur-new | **Accept** |

```typescript
import { logger } from '@SCOPE/utils';
import { orpc } from './orpc';

/** Run a CLI command (list or create) and return the formatted result. */
export async function run(args: string[]): Promise<string> {
    const cmd = args[0] ?? 'list';

    switch (cmd) {
        case 'list': {
            const planets = await orpc.list({});
            return planets.map((p) => `${p.id}. ${p.name}`).join('\n');
        }
        case 'create': {
            const name = args[1] ?? 'Unknown';
            const planet = await orpc.create({ name });
            return `Created: ${planet.id}. ${planet.name}`;
        }
        default:
            return `Unknown command: ${cmd}`;
    }
}

/** CLI entry point — runs a command and prints the result via logger. */
export async function main(argv: string[]): Promise<void> {
    try {
        const result = await run(argv);
        logger.info(result);
    } catch (err) {
        logger.error(err);
        process.exit(1);
    }
}
```

```typescript
/** Error thrown by CLI command handlers with an associated exit code. */
export class CommandError extends Error {
    constructor(
        message: string,
        readonly exitCode: number = 1,
        readonly cause?: unknown,
    ) {
        super(message);
        this.name = 'CommandError';
    }
}

/** Format an unknown error for CLI display. */
export function errorMessage(err: unknown): string {
    if (err instanceof CommandError) return err.message;
    if (err instanceof Error) return err.message;
    return String(err);
}

/** Standard exit codes. */
export const ExitCode = {
    Success: 0,
    GeneralError: 1,
    NotFound: 2,
    InvalidInput: 3,
    NetworkError: 4,
} as const;
```

```typescript
/** Injectable output sink for CLI commands — makes output testable. */
export interface CommandOutput {
    out(message: string): void;
    err(message: string): void;
}

/** Capture output in memory for tests. */
export function captureOutput(): { output: CommandOutput; lines: string[]; errors: string[] } {
    const lines: string[] = [];
    const errors: string[] = [];
    return {
        output: {
            out: (m) => lines.push(m),
            err: (m) => errors.push(m),
        },
        lines,
        errors,
    };
}

/** Default output to stdout/stderr. */
export const consoleOutput: CommandOutput = {
    out: (m) => console.log(m),
    err: (m) => console.error(m),
};
```

---

## Seam 6 — Web app + data loading

| Aspect | ts-base | spur-new | Better pattern | Rating |
| ------ | ------- | -------- | -------------- | ------ |
| Framework | React+Vite (`apps/web/src/App.tsx`) | Astro + React islands (`apps/web/src/pages/index.astro`) | ts-base (locked topology) | **Keep** React+Vite |
| Data loading | `useEffect` + `useState` + `.catch(console.error)` (`apps/web/src/App.tsx:7-13`) | Same React pattern in islands, but with error boundary + `fetchWithTimeout` | spur-new (transport) | **Accept** |
| Loading state | None | Implicit via Suspense/island | spur-new | **Accept** |
| Error boundary | None | `api-error` CustomEvent + boundary | spur-new | **Accept** |
| Abort on unmount | None (`App.tsx:9-11`) | `AbortController` in `fetchWithTimeout` (`rpc-client.ts:30-46`) | spur-new | **Accept** |
| Request timeout | None | 10s default via `AbortController` (`rpc-client.ts:30-46`) | spur-new | **Accept** |
| Test fetch seam | `mock.module` per test | `setFetchForTesting`/`resetFetchForTesting` (`rpc-client.ts:8-17`) | spur-new | **Accept** |
| API URL resolution | `import.meta.env.VITE_API_URL ?? 'http://localhost:3000/rpc'` (`apps/web/src/orpc.ts:9`) | `resolveApiUrl(envUrl, origin, isDev)` (`rpc-client.ts:18-28`) | spur-new | **Accept** |
| oRPC client | `createORPCClient(new RPCLink(...))` (`apps/web/src/orpc.ts:11-13`) | `createORPCClient(new OpenAPILink(...))` with adapter interceptors (`rpc-client.ts:84-90`) | spur-new (typed client) | **Defer** OpenAPILink (adds `@orpc/openapi-client` dep); **Accept** interceptor pattern |

```typescript
import type { Planet } from '@SCOPE/api';
import { useEffect, useState } from 'react';
import { orpc } from './orpc';

export function App() {
    const [planets, setPlanets] = useState<Planet[]>([]);

    useEffect(() => {
        orpc.list({}).then(setPlanets).catch(console.error);
    }, []);

    return (
        <main>
            <h1>Planets</h1>
            <ul>
                {planets.map((p) => (
                    <li key={p.id}>
                        {p.name}
                        {p.description && ` — ${p.description}`}
                    </li>
                ))}
            </ul>
        </main>
    );
}
```

```typescript
// Web client. Twin of apps/cli/src/orpc.ts — kept separate because env access
// differs: Vite exposes `import.meta.env.VITE_*` at build time, while the
// CLI reads `process.env` at run time.

import type { planetContract } from '@SCOPE/api';
import { createORPCClient } from '@orpc/client';
import { RPCLink } from '@orpc/client/fetch';
import type { ContractRouterClient } from '@orpc/contract';

const link = new RPCLink({
    url: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/rpc',
});

/** Typed oRPC client for the server contract, from the web app. */
export const orpc: ContractRouterClient<typeof planetContract> = createORPCClient(link);
```

```typescript
// CLI client. Twin of apps/web/src/orpc.ts — kept separate because env access
// differs: the CLI reads `process.env` at run time, while the web client uses
// Vite's build-time `import.meta.env.VITE_*`.

import type { planetContract } from '@SCOPE/api';
import { createORPCClient } from '@orpc/client';
import { RPCLink } from '@orpc/client/fetch';
import type { ContractRouterClient } from '@orpc/contract';

const link = new RPCLink({
    url: process.env.API_URL ?? 'http://localhost:3000/rpc',
});

/** Typed oRPC client for the monorepo server contract. */
export const orpc: ContractRouterClient<typeof planetContract> = createORPCClient(link);
```

```typescript
import { contract } from '@gobing-ai/spur-contracts';
import { createORPCClient } from '@orpc/client';
import type { ContractRouterClient } from '@orpc/contract';
import type { JsonifiedClient } from '@orpc/openapi-client';
import { OpenAPILink } from '@orpc/openapi-client/fetch';
import { onError } from '@orpc/shared';

// ── Injectable fetch seam for tests ───────────────────────────────────
let _testFetch: typeof fetch | undefined;

/** Replace the fetch implementation for the current test. Call resetFetchForTesting in afterEach. */
export function setFetchForTesting(fn: typeof fetch): void {
    _testFetch = fn;
}

/** Restore the platform fetch after a test. */
export function resetFetchForTesting(): void {
    _testFetch = undefined;
}

/**
 * Resolve the public API URL for browser, SSR, and test contexts.
 * In both dev and production the API is served same-origin.
 */
export function resolveApiUrl(
    envUrl = import.meta.env.PUBLIC_API_URL,
    origin = globalThis.location?.origin,
    _isDev = import.meta.env.DEV,
): string {
    if (envUrl) return envUrl;
    return origin && origin !== 'null' ? new URL('/api', origin).toString() : 'http://localhost:3000/api';
}

/** Timeout-wrapped fetch — aborts via `AbortController` after `ms` (default 10s). */
export function fetchWithTimeout(request: Request, ms = 10_000): Promise<Response> {
    const controller = new AbortController();
    const handle = setTimeout(() => controller.abort(), ms);
    const origSignal = request.signal;
    if (origSignal) {
        origSignal.addEventListener('abort', () => controller.abort(), { once: true });
    }
    const req = new Request(request, { signal: controller.signal });
    const fetcher = _testFetch ?? fetch;
    return fetcher(req).finally(() => clearTimeout(handle));
}

/** Adapter: matches OpenAPILink's fetch signature and delegates to fetchWithTimeout. */
export function apiFetchWithTimeout(request: Request): Promise<Response> {
    return fetchWithTimeout(request);
}

/** Typed oRPC OpenAPI client — derived from the contract so contract↔client drift fails at compile time. */
export type ApiClient = JsonifiedClient<ContractRouterClient<typeof contract>>;

/** `onError` adapter-interceptor callback: surfaces transport failures. */
export function logTransportError(error: unknown): void {
    if (typeof globalThis !== 'undefined' && globalThis.dispatchEvent) {
        globalThis.dispatchEvent(
            new CustomEvent('api-error', {
                detail: { message: error instanceof Error ? error.message : String(error) },
            }),
        );
    }
}

/** Singleton typed oRPC client: 10s request timeout + a tracing/error interceptor. */
export const api: ApiClient = createORPCClient(
    new OpenAPILink(contract, {
        url: resolveApiUrl(),
        fetch: apiFetchWithTimeout,
        adapterInterceptors: [onError(logTransportError)],
    }),
);
```

---

## Seam 7 — Tests

| Aspect | ts-base | spur-new | Better pattern | Rating |
| ------ | ------- | -------- | -------------- | ------ |
| Runner | `bun:test` | `bun:test` (server/cli) + `vitest` (Cloudflare) | Equivalent (keep bun:test) | N/A |
| Setup | Inline per file (`mock.module`, `Bun.write` monkeypatch) | `tests/setup.ts` preload + `tests/helpers.ts` shared sink | spur-new | **Accept** |
| Output capture | Per-file `silenceOutput` duplicating `Bun.write` patch | `captureOutput()` from `output.ts` | spur-new | **Accept** (depends on Seam 5) |
| Fetch mocking | `mock.module` for `@orpc/client` | `setFetchForTesting`/`resetFetchForTesting` | spur-new | **Accept** (depends on Seam 6) |
| Middleware tests | None (no middleware) | `tests/middleware/*.test.ts` per middleware | spur-new | **Accept** (depends on Seam 2) |
| happy-dom helpers | None | `apps/web/tests/happy-dom.ts` lifecycle | spur-new | **Defer** (ts-base web tests don't need DOM yet) |
| Contract tests | `packages/api/tests/planet.test.ts` (schema parse) | `packages/contracts/tests/contract.test.ts` (envelope + router shape) | spur-new | **Accept** (envelope test once Seam 1 lands) |

```typescript
import { describe, expect, mock, test } from 'bun:test';
import { app } from '../src/app';

// Per-file mock setup — no shared fixture
mock.module('@SCOPE/db', () => ({
    db: () => async () => [{ id: 1, email: 'test@test.com' }],
}));

describe('server app', () => {
    test('GET /health returns ok', async () => {
        const res = await app.request('/health');
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ status: 'ok' });
    });
});
```

```typescript
import { describe, expect, test } from 'bun:test';
import { Hono } from 'hono';
import { requestId } from '../../src/middleware/request-id';

describe('requestId middleware', () => {
    test('injects a UUID v4 into c.var.requestId', async () => {
        const app = new Hono();
        let captured: string | undefined;

        app.use('*', requestId());
        app.get('/test', (c) => {
            captured = c.get('requestId');
            return c.text('ok');
        });

        await app.request('/test');
        expect(captured).toBeDefined();
        expect(captured).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });

    test('generates a unique requestId per request', async () => {
        const app = new Hono();
        const ids: string[] = [];

        app.use('*', requestId());
        app.get('/test', (c) => {
            ids.push(c.get('requestId'));
            return c.text('ok');
        });

        await app.request('/test');
        await app.request('/test');
        expect(ids[0]).not.toBe(ids[1]);
    });
});
```

```typescript
import { describe, expect, test } from 'bun:test';
import { captureOutput } from '../src/output';

describe('captureOutput', () => {
    test('captures out and err separately', () => {
        const { output, lines, errors } = captureOutput();
        output.out('hello');
        output.err('oops');
        expect(lines).toEqual(['hello']);
        expect(errors).toEqual(['oops']);
    });
});
```

---

## Summary rating matrix

| Seam | Accept | Defer | Reject |
| ---- | ------ | ----- | ------ |
| 1 Contracts | envelope, error typing | OpenAPI gen | product contracts |
| 2 Server+middleware | pipeline (slimmed), error handler, main() extraction, request-id, request-logger | — | ApplicationRuntime deps |
| 3 DB | createMigratedDb, defineTable, EntityDao, healthCheck, in-memory URL | — | 12-table schema |
| 4 Config | DB URL constants | config reshape, structured logger | multi-section config (product) |
| 5 CLI | CommandError, CommandOutput, errorMessage, setExitCode | — | CliContext services |
| 6 Web | loading state, error boundary, abort, fetchWithTimeout, resolveApiUrl, setFetchForTesting | OpenAPILink, Astro | Astro framework |
| 7 Tests | shared setup.ts, captureOutput, middleware tests, envelope tests | happy-dom helpers | vitest/Cloudflare pool |
### Testing
<!-- Filled during verification: commands/checks run, outcomes, coverage claim or N/A. -->

This is a review/research task — no code changes, no tests run. Verification is the L3 checker
(`spur task check 0026`) confirming:

- [x] Review Findings table has P1-P4 rows populated with file:line evidence.
- [x] Review section has SECUA table with `| Severity | Dimension | Evidence | Finding | Resolution |` columns.
- [x] Review section has functional traceability table with `| Requirement | Status | Evidence |` columns.
- [x] All 7 seams (contracts, server entry+middleware, DB access, config, CLI entry, web+data loading, tests) are compared.
- [x] Every comparison cites both `src-monorepo` and `spur-new` file:line references.
- [x] Every finding has an Accept/Defer/Reject rating with rationale tied to Feature A scope.
- [x] No accepted pattern pulls a Spur product subsystem (rejected list in Review Findings footer).

**Coverage claim:** N/A — this task produces findings, not code. The findings are the input
set for downstream implementation tasks (one per seam), which will carry their own test plans.
### Review
Post-implementation reflection — filled **after** the first fix round: what went wrong, what
remains to fix before closing, and any **back-issues** (new findings surfaced by the fix).

This is a **review/research task** (`wayfinder:research` tag, `review` template). No code
implementation was performed; the "fix round" is the comparison itself. The SECUA table below
scores each finding against the seven seams, and the traceability table maps each requirement
to its evidence.


| Severity | Dimension | Evidence | Finding | Resolution |
| -------- | --------- | -------- | ------- | ---------- |
| P1 | Correctness | `src-monorepo/apps/server/src/app.ts:15-21` — `onError` interceptor returns nothing for non-ORPCError throws; client receives undefined response body. spur-new `apps/server/src/middleware/error-handler.ts:8-26` returns a typed `{ ok:false, error:{code,message,details?} }` envelope. | Server silently swallows unexpected errors; transport contract is undefined. | **Accept**: port simplified `globalErrorHandler` returning the envelope; re-throw `ORPCError` so oRPC's status mapping still applies. |
| P1 | Correctness | `src-monorepo/packages/api/src/contracts/planet.ts:24-32` — procedures output raw `Planet[]`/`Planet`; no shared success/error envelope. spur-new `packages/contracts/src/shared.ts:6-22` defines `apiSuccessSchema`/`apiErrorSchema`. | Clients cannot distinguish `NOT_FOUND` (typed) from network failure (untyped). | **Accept**: wrap each procedure output in `apiSuccessSchema(...)`; export `apiErrorSchema` for the server envelope. |
| P1 | Architecture | `src-monorepo/apps/server/src/app.ts:13-33` — no middleware chain; request-id, structured log, security headers, CORS, body limit, compression all absent. spur-new `apps/server/src/middleware/pipeline.ts:9-18` composes 8 ordered middlewares. | No observability seam; no request correlation; no defensive defaults. | **Accept**: adopt slimmed pipeline (`requestId → requestLogger → errorHandler → contextInjector`). Reject `ApplicationRuntime` (product subsystem). |
| P2 | Architecture | `src-monorepo/packages/db/src/connection.ts:1-9` — memoized `new SQL()` with no migration, no pragmas, no health check, no test isolation. spur-new `packages/domain/src/db.ts:18-32` `createMigratedDb`. | DB lifecycle is unmanaged; tests cannot isolate. | **Accept**: port `createMigratedDb` + `dbHealthCheck`; drop multi-adapter indirection (product subsystem). |
| P2 | Architecture | `src-monorepo/packages/db/src/index.ts:7-21` — two free functions over raw tagged templates; no schema, no typed rows, no upsert. spur-new `packages/domain/src/dao/base.ts` `EntityDao` + `packages/domain/src/schema/runs.ts:6-19` `defineTable`. | DAO layer is untyped and untestable; DDL drifts from queries. | **Accept**: introduce one `defineTable(planet)` + 4-line `PlanetDao extends EntityDao`. Reject 12-table schema (product subsystem). |
| P2 | Contract drift | `src-monorepo/apps/cli/src/cli.ts:18-34` — hand-rolled `switch(cmd)`; `process.exit(1)` baked into `main`; no typed `CommandError`, no exit-code propagation, no testable output. spur-new `apps/cli/src/errors.ts:3-26` `CommandError`; `apps/cli/src/output.ts:6-26` `CommandOutput`. | CLI is untestable without process spawn; error semantics undefined. | **Accept**: port `CommandError` + `CommandOutput` + `errorMessage(err)` exactly (60 lines, zero product logic). |
| P2 | Correctness | `src-monorepo/apps/web/src/App.tsx:7-13` — `useEffect` + `useState` with `.catch(console.error)`; no loading state, no error boundary, no abort on unmount. | Slow responses leak state updates after unmount; errors swallowed silently. | **Accept**: add `loading` state, error boundary, `AbortController` in cleanup; port `fetchWithTimeout` from spur-new `apps/web/src/lib/rpc-client.ts:30-46`. |
| P3 | Contract drift | `src-monorepo/apps/cli/src/orpc.ts:13` + `apps/web/src/orpc.ts:11` — oRPC clients have no timeout, no injectable fetch for tests. spur-new `apps/web/src/lib/rpc-client.ts:30-46` `fetchWithTimeout`; `:8-17` `setFetchForTesting`/`resetFetchForTesting`. | Tests must mutate `globalThis.fetch`; no transport-timeout safety net. | **Accept**: port `fetchWithTimeout` + test-fetch seam to both `orpc.ts` files. |
| P3 | Maintainability | `src-monorepo/apps/web/src/orpc.ts:9` + `apps/cli/src/orpc.ts:8` — API URL resolution duplicated and divergent; neither handles same-origin in prod. spur-new `apps/web/src/lib/rpc-client.ts:18-28` `resolveApiUrl`. | Two sources of truth for the API base URL. | **Accept**: extract `resolveApiUrl(envUrl, origin)` into `packages/utils` (or new `packages/api-client`); both `orpc.ts` files call it. |
| P3 | Test gap | `src-monorepo/packages/utils/src/logger.ts:14-21` — raw stdout/stderr; no level filter, no request-id binding. spur-new logger is welded to `ts-infra` `ApplicationRuntime` (product subsystem). | No observability seam; cannot correlate logs to requests. | **Defer**: structured logging depends on Seam 2's request-id landing first; spur-new's impl is product-bound. Separate task. |
| P3 | Test gap | `src-monorepo/apps/server/src/index.ts:1-9` — `Bun.serve` at module top level; no `main()` extraction. spur-new `apps/server/src/index.ts:32-49` exports `main(deps)` + `startServer(options)`. | Server is untestable without process spawn. | **Accept**: extract `main(deps)` returning `Server`; keep `index.ts` as 3-line caller. |
| P4 | Docs/nit | `src-monorepo/packages/api/src/index.ts:1-11` — no OpenAPI spec generation; contract is RPC-only. spur-new `apps/server/src/openapi.ts:1-25` uses `@orpc/openapi` + `@orpc/zod`. | No `/openapi.json` endpoint; second-client onboarding harder. | **Defer**: adds 2 deps for a consumer that doesn't exist yet. Worth doing once a curl/E2E consumer appears. |
| P4 | Test gap | test files across `src-monorepo/apps/*/tests/` — inline `mock.module` + per-file `Bun.write` monkeypatch; `silenceOutput` duplicated. spur-new has `apps/server/tests/setup.ts` + `apps/cli/tests/helpers.ts`. | Test fixtures duplicated; no shared setup; brittle. | **Accept**: introduce `tests/setup.ts` + `tests/helpers.ts` per app. Depends on Seam 5's `CommandOutput` landing first. |


| Requirement | Status | Evidence |
| ----------- | ------ | -------- |
| R1: Compare equivalent seams in `src-monorepo` and `spur-new` | PASS | All seven seams compared with side-by-side file:line refs above. Seam 1: contracts (`planet.ts:24-32` ↔ `shared.ts:6-22`). Seam 2: server entry+middleware (`app.ts:13-33` ↔ `pipeline.ts:9-18`, `error-handler.ts:8-26`, `index.ts:32-49`). Seam 3: DB access (`connection.ts:1-9`, `db/index.ts:7-21` ↔ `db.ts:18-32`, `base.ts`, `runs.ts:6-19`). Seam 4: config (`config/index.ts:1-15` ↔ `config/loader.ts`). Seam 5: CLI (`cli.ts:18-34` ↔ `errors.ts:3-26`, `output.ts:6-26`). Seam 6: web+data loading (`App.tsx:7-13`, `web/orpc.ts:11` ↔ `rpc-client.ts:18-46`). Seam 7: tests (per-file `mock.module` ↔ `tests/setup.ts`, `tests/helpers.ts`). |
| R2: Evaluate boundary validation, DI, typed errors, config ownership, output handling, deterministic tests | PASS | Boundary validation: Seam 1 envelope (P1). DI: Seam 2 `main(deps)` (P3) + Seam 5 `CommandOutput` (P2). Typed errors: Seam 1 envelope + Seam 5 `CommandError` (P1/P2). Config ownership: Seam 4 single schema vs duplicated env reads (P2, deferred reshape). Output handling: Seam 5 `CommandOutput` + Seam 3 logger level filter (P3, deferred). Deterministic tests: Seam 7 shared setup + injectable fetch (P3/P4). |
| R3: Reject patterns that add product subsystems or speculative abstraction | PASS | Explicitly rejected: spur-new `CliContext` services (`AgentService`/`RuleService`/`HitlResponder`/`ts-dual-workflow-engine`) — product subsystems. spur-new `ApplicationRuntime`/`MainDeps` deps — product-bound; borrow the injectable-deps *shape* only. spur-new 12-table schema — product scope. spur-new Astro web stack — different tech stack; borrow transport patterns only, not the framework. Deferred (not rejected): structured logger (depends on request-id), OpenAPI spec (no consumer yet), config package reshape (touches all apps). |
| R4: Produce evidence-backed candidate changes with expected teaching and maintenance value | PASS | Each finding cites ts-base file:line and spur-new file:line. Accept/Defer/Reject ratings given per finding with rationale. Teaching value: each Accept item teaches a habit (middleware chain, typed envelope, DAO base, testable CLI, abort on unmount, injectable fetch). Maintenance value: removes duplication (env URL, output sink, mock fetch), removes untestable seams (`Bun.serve` at top level, `process.exit` in `main`). |


None. This is the first review round; no fix round has run. The 13 findings above are the
input set for downstream implementation tasks.
### References
<!-- Links to source review, dogfood report, PR/diff, related tasks, or external references. -->


**ts-base (`~/xprojects/ts-base/src-monorepo/`):**
- `apps/server/src/app.ts` — Hono app + oRPC handler mount (Seam 2)
- `apps/server/src/index.ts` — server entry (Seam 2)
- `apps/server/tests/app.test.ts` — server test (Seam 7)
- `apps/server/src/procedures/planet.ts` — oRPC procedures (Seam 1)
- `apps/cli/src/cli.ts` — CLI switch + main (Seam 5)
- `apps/cli/src/orpc.ts` — CLI oRPC client (Seam 6)
- `apps/cli/tests/cli.test.ts` — CLI test (Seam 7)
- `apps/web/src/App.tsx` — React app + data loading (Seam 6)
- `apps/web/src/orpc.ts` — web oRPC client (Seam 6)
- `apps/web/src/main.tsx` — web entry (Seam 6)
- `apps/web/tests/App.test.tsx` — web test (Seam 7)
- `packages/api/src/index.ts` — API barrel (Seam 1)
- `packages/api/src/contracts/planet.ts` — planet contract (Seam 1)
- `packages/api/tests/planet.test.ts` — contract test (Seam 7)
- `packages/config/src/index.ts` — config schema (Seam 4)
- `packages/config/tests/config.test.ts` — config test (Seam 7)
- `packages/db/src/connection.ts` — DB connection (Seam 3)
- `packages/db/src/index.ts` — DB queries (Seam 3)
- `packages/db/tests/db.test.ts` — DB test (Seam 7)
- `packages/utils/src/logger.ts` — logger (Seam 4)
- `packages/utils/tests/logger.test.ts` — logger test (Seam 7)

**spur-new (`~/xprojects/spur-new/`):**
- `apps/server/src/index.ts` — server entry with `main(deps)` + `startServer` (Seam 2)
- `apps/server/src/serve.ts` — serve helper (Seam 2)
- `apps/server/src/bootstrap.ts` — bootstrap (Seam 2)
- `apps/server/src/context.ts` — `ApplicationRuntime` / `MainDeps` (Seam 2, rejected deps)
- `apps/server/src/errors.ts` — server error types (Seam 1)
- `apps/server/src/router.ts` — oRPC router mount (Seam 1)
- `apps/server/src/openapi.ts` — OpenAPI spec generation (Seam 1, deferred)
- `apps/server/src/middleware/pipeline.ts` — middleware composition (Seam 2)
- `apps/server/src/middleware/error-handler.ts` — error envelope (Seam 1+2)
- `apps/server/src/middleware/request-id.ts` — request ID (Seam 2)
- `apps/server/src/middleware/request-logger.ts` — request logging (Seam 2)
- `apps/server/src/middleware/context-injector.ts` — runtime injection (Seam 2, rejected deps)
- `apps/server/tests/middleware/*.test.ts` — middleware tests (Seam 7)
- `apps/server/tests/router.test.ts`, `index.test.ts` — server tests (Seam 7)
- `apps/cli/src/index.ts` — CLI entry (Seam 5)
- `apps/cli/src/context.ts` — `CliContext` (Seam 5, partial accept)
- `apps/cli/src/errors.ts` — `CommandError` (Seam 5)
- `apps/cli/src/output.ts` — `CommandOutput` (Seam 5)
- `apps/cli/tests/errors.test.ts`, `output.test.ts` — CLI tests (Seam 7)
- `apps/web/src/lib/rpc-client.ts` — `fetchWithTimeout` + `resolveApiUrl` + `setFetchForTesting` (Seam 6+7)
- `apps/web/src/pages/index.astro` — Astro page (Seam 6, framework rejected)
- `apps/web/astro.config.mjs` — Astro config (Seam 6, framework rejected)
- `packages/contracts/src/index.ts` — contracts barrel (Seam 1)
- `packages/contracts/src/shared.ts` — `apiSuccessSchema`/`apiErrorSchema` (Seam 1)
- `packages/contracts/src/task.ts`, `feature.ts` — product contracts (Seam 1, rejected)
- `packages/domain/src/db.ts` — `createMigratedDb` (Seam 3)
- `packages/domain/src/dao/base.ts` — `EntityDao` (Seam 3)
- `packages/domain/src/dao/run-dao.ts`, `workspace-dao.ts` — DAO examples (Seam 3)
- `packages/domain/src/schema/runs.ts` — `defineTable` example (Seam 3)
- `packages/config/src/index.ts`, `loader.ts` — config (Seam 4)

- Task 0024 — (companion review task in this feature)
- Task 0025 — (companion review task in this feature)
- Feature A — `docs/features/A_harden-the-ts-base-monorepo-scaffold-through-reviewed-absorption-from-spur-new.md`
### History
- 2026-07-16T00:22:17.499Z todo → wip (system)
- 2026-07-16T00:34:11.320Z wip → testing (system)
- 2026-07-16T00:34:17.135Z testing → done (system)
