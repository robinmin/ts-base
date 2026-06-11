# Product Brief

## Product

`ts-base` is a project-template and agent-tooling workbench for TypeScript projects. It provides curated starting points and a controlled path for feeding reusable project experience back into the template.

## Users

- Senior developers creating new TypeScript projects.
- AI coding agents operating inside generated projects.
- Maintainers who want reusable conventions without copying project-specific mistakes.

## Problem

Starting projects quickly is easy; preserving accumulated engineering experience without drift is harder. Existing templates handle initial scaffolding, but they do not usually provide a controlled mechanism for importing later improvements from real projects.

## Goals

- Generate app, lib, cli, and monorepo projects quickly.
- Keep generated projects production-oriented: Bun, TypeScript, Biome, tests, hooks, and conventional commits.
- Provide a review-first convergence workflow for reusable agent skills, slash commands, and tooling conventions.
- Preserve a single source of truth for agent capabilities.
- Route reusable implementation code to `ts-libs` instead of mixing library code into this template.
- Use Spur as a quality harness for architecture and workflow invariants.

## Non-Goals

- Automatically importing everything from a source project.
- Replacing existing setup scripts during the first convergence implementation.
- Writing directly to `~/xprojects/ts-libs`.
- Bundling Spur internals into generated projects by default.
- Managing secrets, deployment accounts, or source-project infrastructure.

## Primary Workflows

### Divergence

1. Clone or copy `ts-base`.
2. Choose `app`, `lib`, `cli`, or `mono`.
3. Run `bun run setup`.
4. The chosen scaffold is promoted and unused modes are removed.
5. The generated project becomes a normal project.

### Convergence

1. Run `converge scan` against a source project and target mode.
2. Review the generated candidate inventory.
3. Approve selected candidate IDs.
4. Run `converge apply`.
5. Verify with lint, tests, and Spur checks when relevant.

## Success Criteria

- Project direction is clear from `README.md`, `AGENTS.md`, ADR, PRD, and architecture docs.
- Convergence scans are dry-run by default.
- Sensitive content is blocked even if requested.
- Project-specific content cannot be imported without review and rewrite.
- Reusable code is surfaced as `ts-libs-candidate`.
- Re-running convergence is idempotent.
- The single CLI entrypoint remains the only new command surface.

## Risks

- Heuristics can misclassify source material; review artifacts must keep rationale visible.
- Agent adapter formats may diverge; canonical `.claude` content must remain authoritative.
- Convergence scope can grow into a package manager too early; versioning and registry behavior stay out of scope until repeated imports justify them.
