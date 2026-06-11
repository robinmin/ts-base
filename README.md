# ts-base

`ts-base` is a Bun + TypeScript + Biome project-template and agent-tooling workbench. It exists to help developers create new projects quickly while preserving proven engineering practices from real projects.

The repository has two flows:

- **Divergence:** create a new app, library, CLI, or monorepo from curated scaffolds.
- **Convergence:** review and absorb reusable agent skills, slash commands, workflow conventions, and quality practices from selected source projects without importing project-specific drift.

## Stack

- **Bun 1.3.14** — runtime, package manager, and test runner
- **TypeScript** — ESNext, strict mode
- **Biome 2.4.16** — linter and formatter
- **Lefthook** — Git hooks
- **Cocogitto** — conventional commits
- **proto** — pinned tool versions via `.prototools`
- **Spur** — project quality harness and architecture-rule gate

## Quick Start

```bash
# Scaffold from the template
PROJECT_NAME=my-project
bunx degit robinmin/ts-base $PROJECT_NAME
cd $PROJECT_NAME

# Optional: edit package.json "name" first for cli/mono workspace scope.
bun run setup
# bun run setup --mode=app
# bun run setup --mode=lib
# bun run setup --mode=cli
# bun run setup --mode=mono

proto use
bun install
bun run check
```

After setup, the selected mode is promoted and unused scaffolds are deleted. The result should read like a normal single-mode project, not a multi-mode template checkout.

## Project Modes

Before setup the template ships four modes side by side:

| Mode | Source | Result |
| ---- | ------ | ------ |
| `app` | `src-app/` | Flat Bun HTTP server in `src/` |
| `lib` | `src-lib/` | Publishable TypeScript library in `src/` |
| `cli` | `src-cli/` | Bun workspace with `apps/cli` and shared packages |
| `mono` | `src-monorepo/` | Turborepo + Bun workspaces with server, web, CLI, and shared packages |

Mode-specific contracts live in `AGENTS-<mode>.md` and `docs/00_ADR-<mode>.md` before setup. `scripts/setup.ts` swaps the selected files into `AGENTS.md` and `docs/00_ADR.md`.

## Convergence Workflow

Convergence is for importing reusable project experience back into this template. The intended flow is review-first:

```bash
bun run scripts/ts-base.ts converge scan --from ../source-project --mode app --type all
bun run scripts/ts-base.ts converge review --review docs/reviews/<review-id>.json
bun run scripts/ts-base.ts converge apply --review docs/reviews/<review-id>.json --approve candidate-id
```

`scan` discovers candidate agent capabilities, classifies them, and writes a review artifact. `apply` only writes explicitly approved candidates.

Candidate classes:

| Class | Meaning |
| ----- | ------- |
| `generic` | Reusable capability that can be imported into this template |
| `mode-specific` | Reusable only for selected modes |
| `ts-libs-candidate` | Reusable implementation code that belongs in `~/xprojects/ts-libs` instead of this repo |
| `project-specific` | Source-project material blocked by default |
| `sensitive` | Secrets, credentials, endpoints, or unsafe material; never imported |
| `unknown` | Needs human review before any action |

## Agent Capability Model

- `.claude/skills/<name>/SKILL.md` is the canonical skill format.
- `.claude/commands/<name>.md` is the canonical slash-command format.
- `.agents/skills` is a symlink/adaptor target for other agents.
- Cross-agent copies are avoided unless a generated adapter owns the conversion.
- Every new skill, command, config, symlink, adapter, or rewrite requires explicit confirmation.

## Spur

Spur is the quality harness used across Robin's projects. This repository keeps the standard checks and uses Spur for architectural and workflow invariants where those checks are reusable.

```bash
bun run check       # lint + tests
bun run spur-check  # lint + Spur pre-check + tests + Spur post-check
```

Spur internals must not leak into generated end-user projects unless setup exposes an explicit option for that behavior.

## `ts-base` vs `ts-libs`

Use this rule when convergence finds reusable code:

- Keep project-generation workflows, scaffolds, setup orchestration, agent skills, slash commands, and project-level conventions in `ts-base`.
- Move reusable runtime libraries, pure utilities, framework-agnostic components, shared validation helpers, reusable CLI primitives, and cross-project TypeScript modules to `~/xprojects/ts-libs`.
- Do not write to `ts-libs` from a convergence scan. Produce a `ts-libs-candidate` proposal and handle extraction in a separate confirmed task.

The current `ts-libs` monorepo contains packages such as `@gobing-ai/ts-utils`, `@gobing-ai/ts-runtime`, `@gobing-ai/ts-db`, `@gobing-ai/ts-infra`, `@gobing-ai/ts-ai-runner`, `@gobing-ai/ts-rule-engine`, `@gobing-ai/ts-dual-workflow-engine`, and `@gobing-ai/ts-llm-jsonl-importer`.

## Commands

| Command | Description |
| ------- | ----------- |
| `bun run setup` | Choose and promote app/lib/cli/mono mode |
| `bun run clean` | Remove generated caches from template scaffolds |
| `bun run lint` | Biome check + TypeScript typecheck |
| `bun run typecheck` | TypeScript typecheck only |
| `bun run test` | Bun tests with coverage |
| `bun run check` | Lint + tests |
| `bun run spur-check` | Full quality gate with Spur checks |
| `bun run format` | Biome autofix |
| `bun run autofix` | Format then typecheck |

## Documentation Map

- `AGENTS.md` — coding-agent operating contract.
- `docs/00_ADR.md` — architecture decision record for this template/tooling direction.
- `docs/01_PRD.md` — product brief and scope.
- `docs/03_ARCHITECTURE.md` — architecture overview and design decisions.
- `docs/00_ADR-app.md`, `docs/00_ADR-lib.md`, `docs/00_ADR-cli.md`, `docs/00_ADR-mono.md` — mode-specific ADRs swapped during setup.

## Verification Gate

Before a task is done:

```bash
bun run lint
bun run test
```

For project-direction, convergence, or architecture-rule changes, also run:

```bash
bun run spur-check
```

## Security

Never import secrets, `.env*`, credentials, private endpoints, tokens, or source-project-specific deployment configuration during convergence. Sensitive candidates are blocked even if listed in an approval artifact.

See [SECURITY.md](SECURITY.md) for the security policy.

## License

Apache 2.0 — see [LICENSE](LICENSE).
