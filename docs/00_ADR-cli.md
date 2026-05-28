# 00 — Architecture Decision Record (CLI)

> **Status:** Accepted · **Date:** 2026-05-28 · **Scope:** project-wide, binding.
>
> This is the authoritative architecture decision record for the CLI. `AGENTS.md` points here; changes that contradict a decision below must supersede it with a new dated entry, not diverge silently.

## Context

A Bun + TypeScript + Biome **command-line tool** with shared workspace packages. The design optimizes for a clean separation between the CLI shell and reusable logic, testable command output, and a workspace layout that can grow more packages without restructuring.

---

## ADR-001 — Turborepo + Bun-workspaces layout

**Decision.** The project is a Bun-workspaces monorepo orchestrated by Turborepo:

```
apps/cli/         # the binary (Commander program)
packages/utils/   # shared utilities (add, zod re-export)
tooling/typescript/  # shared tsconfig presets
turbo.json        # task graph
```

Workspaces reference each other by the project scope `@<scope>/*`, rewritten in place at `bun run setup` from the root `package.json` name.

**Rationale.** Even a single-binary CLI benefits from separating reusable logic (`packages/utils`) from the command shell (`apps/cli`): the logic stays unit-testable in isolation and reusable if a second app appears. Turbo caches `build`/`test`/`typecheck` across workspaces and enforces the dependency order via `dependsOn: ["^build"]`.

**Consequences.** The root pins `packageManager: bun@1.3.14` so Turbo can resolve the package manager. New shared code becomes a new `packages/*` workspace, not a folder inside `apps/cli`. Adding a second app is incremental, not structural.

---

## ADR-002 — Commander as the CLI framework

**Decision.** Commands are defined with **Commander** in `apps/cli/src/cli.ts` via a `createProgram()` factory; `src/index.ts` is a thin `#!/usr/bin/env bun` entry that calls `createProgram().parse()` guarded by `import.meta.main`.

**Rationale.** Commander gives declarative subcommands, argument parsing/coercion, and help/version generation without hand-rolling a parser. Returning the program from a factory (rather than parsing at import) makes the whole command tree constructable in tests without invoking `process.argv`.

**Consequences.** New subcommands are registered inside `createProgram()`. The factory must stay side-effect-free (no parsing, no IO at construction) so tests can build and inspect it.

---

## ADR-003 — `@<scope>/*` workspace aliases as the only cross-package boundary

**Decision.** `apps/cli` consumes `packages/utils` exclusively through the workspace alias (`import { add } from '@<scope>/utils'`), declared as a `workspace:*` dependency. Deep relative imports into a sibling package (`../../../packages/...`) are forbidden.

**Rationale.** Aliases keep the package boundary explicit and refactor-safe: a package's internal file layout can change without breaking consumers. `workspace:*` ensures the local source is always linked, never a published version.

**Consequences.** Anything `apps/cli` needs from a package must be in that package's public `src/index.ts` export. zod is re-exported through `packages/utils` so every workspace gets one consistent copy.

---

## ADR-004 — `process.stdout.write` for testable output; `.ts` bin under Bun

**Decision.** Command output goes through `process.stdout.write` directly (not a logger). The binary is declared as `bin: { cli: "./src/index.ts" }` — a TypeScript entry that runs only under Bun.

**Rationale.** Writing to `stdout` directly keeps output assertions simple: tests spy on `process.stdout.write` and check exact strings, free of log-format coupling. Shipping a `.ts` bin leans on Bun's native TS execution — no build step needed for local use.

**Consequences.** The `.ts` bin cannot be resolved by plain `node`. To ship for Node consumers, run `bun run build` (bundles to `apps/cli/dist/index.js`) and repoint `bin` to the built file before publishing — a deliberate, documented step, not the default.

---

## Decisions deliberately deferred

- **Config / persistent state** — none yet; add as a `packages/*` workspace when needed.
- **Interactive prompts, colored output** — out of scope until a command requires them.
