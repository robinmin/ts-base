# Architecture Decision Record

## ADR-001: `ts-base` Owns Divergence and Convergence

**Status:** Accepted  
**Date:** 2026-06-10

### Context

`ts-base` started as a Bun + TypeScript + Biome starter template with four setup modes. The project direction now includes agent-tooling convergence: reusable skills, commands, and workflow practices from real projects should flow back into the template after review.

### Decision

`ts-base` owns two flows:

- **Divergence:** generate app, lib, cli, or mono projects from curated scaffolds.
- **Convergence:** classify and import reusable agent capabilities from specified source projects through an explicit review/apply workflow.

### Consequences

- Project-level docs must describe both flows.
- Convergence tooling must be dry-run by default.
- Project-specific and sensitive material is blocked by default.
- Reusable implementation code is proposed for `ts-libs`, not silently copied into `ts-base`.

## ADR-002: `.claude` Is the Agent Capability Source of Truth

**Status:** Accepted  
**Date:** 2026-06-10

### Context

The repository needs reusable skills and slash commands that can be consumed by multiple coding agents without maintaining divergent copies.

### Decision

Canonical content lives under:

- `.claude/skills/<name>/SKILL.md`
- `.claude/commands/<name>.md`

Other agents consume this content through symlinks or generated adapters. `.agents/skills` remains a symlink/adaptor target.

### Consequences

- Do not maintain copied skill trees across `.claude`, `.agents`, `.codex`, or other agent directories.
- If a target agent requires a different format, generate an adapter from canonical `.claude` content.
- Adapter creation requires explicit confirmation.

## ADR-003: Convergence Uses One CLI Entrypoint

**Status:** Accepted  
**Date:** 2026-06-10

### Context

The existing repository has several setup/support scripts. New convergence tooling could become a pile of unrelated scripts if not constrained.

### Decision

New project-tooling commands use one entrypoint with subcommands:

```bash
bun run scripts/ts-base.ts converge scan
bun run scripts/ts-base.ts converge review
bun run scripts/ts-base.ts converge apply
```

Consolidating existing scripts is intentionally out of scope for the first convergence implementation.

### Consequences

- New convergence behavior is discoverable from one command surface.
- Existing scripts can be integrated later without forcing a broad refactor now.

## ADR-004: Spur Is the Quality Harness

**Status:** Accepted  
**Date:** 2026-06-10

### Context

Robin uses Spur across projects to help AI agents deliver higher-quality software. `ts-base` already exposes Spur check scripts.

### Decision

`ts-base` treats Spur as the project quality harness for architecture and workflow rules. The normal local gate remains `bun run lint` plus `bun run test`; project-direction and convergence changes should also run `bun run spur-check` when available.

### Consequences

- Spur rules can encode reusable invariants.
- Spur-specific internals must not leak into generated projects unless setup exposes an explicit option.
- New Spur checks require the same review standard as other tooling changes.

## ADR-005: `ts-libs` Owns Reusable TypeScript Libraries

**Status:** Accepted  
**Date:** 2026-06-10

### Context

Convergence can discover reusable code inside source projects. Some code belongs in this template; some belongs in the dedicated reusable library monorepo.

### Decision

`ts-base` owns templates, setup orchestration, agent capabilities, and project-level conventions. `~/xprojects/ts-libs` owns reusable runtime libraries, pure utilities, framework-agnostic components, shared validation helpers, reusable CLI primitives, and cross-project TypeScript modules.

### Consequences

- Reusable implementation code discovered during convergence is classified as `ts-libs-candidate`.
- `ts-base` does not write into `ts-libs` from convergence.
- Extraction into `ts-libs` requires a separate confirmed task.
