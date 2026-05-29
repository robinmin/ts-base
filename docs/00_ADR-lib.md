# 00 — Architecture Decision Record (Library)

> **Status:** Accepted · **Date:** 2026-05-28 · **Scope:** project-wide, binding.
>
> This is the authoritative architecture decision record for the library. `AGENTS.md` points here; changes that contradict a decision below must supersede it with a new dated entry, not diverge silently.

## Context

A Bun + TypeScript + Biome **publishable library**. The design optimizes for runtime portability (Node, Bun, browser, edge), a small browser bundle, testable pure functions, and an automated dual-registry release.

---

## ADR-001 — Three-entry split with a runtime-agnostic core

**Decision.** The public surface is split across three entries:

- `src/internal.ts` — the runtime-agnostic core (`add`, `greet`, `getRandomId`, `CoreOptions`). No `node:*`, no browser-only globals.
- `src/index.ts` — the Node/Bun entry; re-exports the core and adds Node-specific helpers (`getSecureRandomId` via `node:crypto`).
- `src/browser.ts` — the browser entry; re-exports the core and provides the same `getSecureRandomId` via Web Crypto (`crypto.getRandomValues`).

**Rationale.** Keeping platform APIs out of the core lets the same logic run unchanged anywhere, while letting consumers (and bundlers) pick the entry whose secure-random implementation matches their runtime. Each entry re-exports the core so consumers get one coherent API regardless of entry point.

**Consequences.** Any code touching a platform API (`node:*`, `crypto`, `btoa`, DOM) belongs in `index.ts` or `browser.ts`, **never** in `internal.ts`. New shared logic goes in the core; new platform-specific behavior must be implemented in both entries to keep parity.

---

## ADR-002 — `tsc` emit to `dist/`, dual Node + browser exports

**Decision.** The library is emitted with **tsc** to `dist/`, then `scripts/fix-dist-esm-extensions.ts` patches emitted runtime JS specifiers for Node-compatible ESM. `package.json` declares conditional `exports` mapping `.` → `dist/index.js` and `./browser` → `dist/browser.js`, with matching `.d.ts` types, `sideEffects: false`, and `files: ["dist"]`.

**Rationale.** `tsc` keeps library output transparent and debuggable while emitting both JS and declaration files with the dual-entry layout the export map needs. Source imports remain extensionless for authoring ergonomics; the build step owns the runtime ESM extension rewrite. `sideEffects: false` enables consumer tree-shaking. Publishing only `dist` keeps the package lean.

**Consequences.** The browser bundle is size-budgeted (see ADR-004). zod and other app-level dependencies are deliberately excluded from a library's deps. TypeScript is a `peerDependency` (`>=5.4 <7`), not a hard dep — consumers compile against their own.

---

## ADR-003 — Dependency-injected RNG for deterministic tests

**Decision.** `getRandomId(random = Math.random)` takes its randomness source as a parameter.

**Rationale.** Pure functions with injected non-determinism are testable without mocking globals. A test can pass a fixed `() => 0.5` and assert exact output, encoding the behavior under a known condition rather than the implementation.

**Consequences.** Any new non-deterministic primitive (time, randomness, IO) should follow the same injection pattern so the core stays unit-testable.

---

## ADR-004 — Automated release via release-please + npm + JSR

**Decision.** Versioning and publishing are automated through release-please, publishing to **both npm and JSR**. `release-please-config.json`, `.release-please-manifest.json`, and `jsr.json` are promoted to the repo root at setup; the workflow lives in `.github/workflows/release-please.yml`.

**Rationale.** Conventional Commits drive semver bumps and changelog generation with no manual version edits. Dual-registry publish reaches both the npm and the Deno/JSR ecosystems from one source.

**Consequences.** Commit discipline is load-bearing — `feat:`/`fix:` and `BREAKING CHANGE:` footers directly determine published versions. The `size` gate must pass before release; exceeding it is an architectural signal, not a number to bump casually.

---

## Decisions deliberately deferred

- **Framework integrations / React bindings** — out of scope; a new entry + ADR if needed.
- **Runtime dependencies** — none today; adding one is a deliberate decision (affects bundle size and consumers).
