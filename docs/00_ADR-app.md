# 00 — Architecture Decision Record (Application)

> **Status:** Accepted · **Date:** 2026-05-28 · **Scope:** project-wide, binding.
>
> This is the authoritative architecture decision record for the application. `AGENTS.md` points here; changes that contradict a decision below must supersede it with a new dated entry, not diverge silently.

## Context

A Bun + TypeScript + Biome **application** — a single deployable HTTP service. The design optimizes for a small, dependency-light service that boots fast, is trivially testable, and leaves data access as an opt-in copy-me pattern rather than a baked-in framework.

---

## ADR-001 — Flat single-package layout

**Decision.** Source lives directly under `src/`, with tests alongside in `src/tests/*.test.ts`. No workspaces, no monorepo tooling.

**Rationale.** A single deployable has no second package to share with. Workspaces and a build orchestrator (Turbo) would be pure overhead. Flat layout keeps `tsconfig`, lint, and test config singular and obvious.

**Consequences.** If the project later grows a second deployable or a shared library, this decision must be revisited — promotion to a workspace layout is a structural change, not an incremental one.

---

## ADR-002 — `Bun.serve` as the HTTP runtime, no web framework

**Decision.** The server is a raw `Bun.serve({ port, fetch })` with manual `URL`-based routing (`src/index.ts`). No Express/Hono/Fastify.

**Rationale.** The starter ships one route (`/health`). A framework's router, middleware stack, and dependency footprint are unjustified at this size. `Bun.serve` is the native, fastest path and uses the standard `Request`/`Response` Web API, so handlers stay portable.

**Consequences.** Routing is a manual `if` on `url.pathname` returning a `404` fallthrough. Once the route count or middleware needs (auth, CORS, logging) grow past a handful, adopting a `fetch`-compatible framework (e.g. Hono) is the expected migration — record it as a new ADR entry then.

---

## ADR-003 — zod-validated config boundary via a factory

**Decision.** Environment configuration is parsed through a zod schema in `src/config.ts`. `loadConfig(env = process.env)` is a factory returning a typed `ServerConfig`; a module-level `config` is the app's singleton, consumed by `src/index.ts` for `port`.

**Rationale.** Validating env at the boundary turns malformed input (e.g. a non-numeric `PORT`) into a clear startup failure instead of a runtime surprise. The factory takes `env` as a parameter so tests construct config per-case without dynamic-import cache busting — deterministic and side-effect-free.

**Consequences.** Every new config value is added to the schema with an explicit type and default (`PORT` defaults to `3000`, bounded `1..65535`). `config.ts` is optional and can be stripped at setup time (`--no-config`), in which case `PORT` is read directly from the environment — chosen for projects that want zero config dependencies.

---

## ADR-004 — Bun-native SQL as a copy-me pattern, not a dependency

**Decision.** Data access is demonstrated in `src/db.example.ts` using Bun's native `SQL` driver with tagged-template (parameterized, injection-safe) queries. It is **not wired into the app** — it is a reference to rename to `db.ts` and adapt, or delete.

**Rationale.** Most starters either bundle a heavy ORM or leave data access undocumented. Bun's native driver is zero-dependency and injection-safe by default (template values are bound, not interpolated). Lazy connection (no client until first query) lets `DATABASE_URL` be set after import. Shipping it as an example keeps the default app dependency-free while still showing the sanctioned pattern.

**Consequences.** No ORM, no migration tooling is prescribed. If a project needs one, that is a new architectural decision. The example is removable at setup time (`--no-db`).

---

## Decisions deliberately deferred

- **Logging / observability** — `console.*` for now; a structured logger is a future ADR.
- **ORM / migrations** — none; revisit when schema complexity warrants.
- **Auth / middleware** — none until a real requirement exists.
