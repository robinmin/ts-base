# ts-base

`ts-base` is a Bun + TypeScript + Biome project-template and agent-tooling workbench. It helps developers create new projects quickly while preserving proven engineering practices from real projects.

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
- **Spur** — project quality harness with 23 rules across architecture, security, and correctness dimensions

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

After setup, the selected mode is promoted and unused scaffolds are deleted. Setup also prunes imported capabilities whose `supported-modes` annotation excludes the chosen mode and re-wires the `.agents/skills` adaptor symlink.

## Project Modes

Before setup the template ships four modes side by side:

| Mode   | Source             | Result                                                              |
| ------ | ------------------ | ------------------------------------------------------------------- |
| `app`  | `src-app/`         | Flat Bun HTTP server in `src/`                                      |
| `lib`  | `src-lib/`         | Publishable TypeScript library in `src/`                            |
| `cli`  | `src-cli/`         | Bun workspace with `apps/cli` and shared `packages/{config,utils}`  |
| `mono` | `src-monorepo/`    | Turborepo + Bun workspaces with `apps/{server,web,cli}` and shared `packages/{api,config,db,utils}` |

Mode-specific contracts live in `AGENTS-<mode>.md` and `docs/00_ADR-<mode>.md` before setup. Setup swaps the selected files into `AGENTS.md` and `docs/00_ADR.md`.

## CLI

All tooling flows through a single entrypoint: `scripts/ts-base.ts`.

```bash
# Divergence — project setup and maintenance
bun run scripts/ts-base.ts setup [--mode=<app|lib|cli|mono>] [--no-db] [--no-config]
bun run scripts/ts-base.ts clean
bun run scripts/ts-base.ts test-setup [app|lib|cli|mono ...]
bun run scripts/ts-base.ts ensure-scaffold-installs

# Convergence — import agent capabilities from source projects
bun run scripts/ts-base.ts converge scan --from <path> --mode <app|lib|cli|mono>
    [--type <all|skills|commands|configs|code>] [--review-dir <dir>] [--review-id <id>]
bun run scripts/ts-base.ts converge review --review <review.json>
bun run scripts/ts-base.ts converge apply --review <review.json> --approve <id[,id...]>
```

The `package.json` scripts are shortcuts to these subcommands:

| Script | Maps to |
| ------ | ------- |
| `bun run setup` | `bun run scripts/ts-base.ts setup` |
| `bun run clean` | `bun run scripts/ts-base.ts clean` |
| `bun run test:setup` | `bun run scripts/ts-base.ts test-setup` |
| `pretest` | `bun run scripts/ts-base.ts ensure-scaffold-installs` |

### Divergence subcommands

**`setup`** — Templates a new project from the selected mode scaffold. Accepts `--mode=<mode>` (interactive prompt if omitted), `--no-db` (skip database deps), `--no-config` (skip config + use minimal app entry).

**`clean`** — Removes generated caches from template scaffolds (node_modules, dist, .turbo, .coverage).

**`test-setup`** — End-to-end smoke test: copies the repo to a temp directory, runs setup + install + check for each specified mode. Defaults to all modes.

**`ensure-scaffold-installs`** — Run by `pretest` before the test suite. Installs workspace deps in `src-cli/` and `src-monorepo/` and creates `@SCOPE/*` → `../../packages/*` symlinks in `node_modules/`.

### Convergence workflow

Convergence imports reusable project experience back into this template. The flow is review-first — `scan` never writes outside `docs/reviews/`:

```bash
# Discover and classify candidates (dry-run)
bun run scripts/ts-base.ts converge scan --from ../source-project --mode app --type all

# Review a scan artifact
bun run scripts/ts-base.ts converge review --review docs/reviews/<review-id>.json

# Apply only explicitly approved candidate IDs
bun run scripts/ts-base.ts converge apply --review docs/reviews/<review-id>.json --approve candidate-id-1,candidate-id-2
```

**Apply behavior:**

- Re-classifies live source content before writing — content changes between scan and apply cannot bypass the blocklist.
- Mode-specific candidates receive a `supported-modes` frontmatter annotation in the destination file.
- Refreshes the `.agents/skills` adaptor symlink after applying.
- Refuses artifacts whose `targetRoot` differs from the current project root.
- Returns exit code 2 when any approved candidate is blocked.

Candidate classes:

| Class               | Meaning                                                                                 |
| ------------------- | --------------------------------------------------------------------------------------- |
| `generic`           | Reusable capability that can be imported into this template                             |
| `mode-specific`     | Reusable only for selected modes; annotated with `supported-modes` on write             |
| `ts-libs-candidate` | Reusable implementation code that belongs in `~/xprojects/ts-libs`, not this repo       |
| `project-specific`  | Source-project material blocked by default (org names, cloud targets, absolute paths)   |
| `sensitive`         | Secrets, credentials, endpoints — hard-blocked, never imported                          |
| `unknown`           | Needs human review before any action; includes outside-root mutation commands           |

## Agent Capability Model

- `.claude/skills/<name>/SKILL.md` is the canonical skill format.
- `.claude/commands/<name>.md` is the canonical slash-command format.
- `.agents/skills` is a symlink/adaptor target for other agents, wired by both setup and `converge apply`.
- Mode-scoped capabilities carry a `supported-modes` frontmatter annotation so setup-time pruning can remove capabilities irrelevant to the chosen mode.
- Cross-agent copies are avoided unless a generated adapter owns the conversion.
- Every new skill, command, config, symlink, adapter, or rewrite requires explicit confirmation.

## Spur

Spur is the quality harness used across Robin's projects. The `recommended-pre-check` preset runs 21 rules across 6 categories (TypeScript, structure, boundary, surface, output-boundaries, DAO). The `recommended-post-check` preset runs 2 additional rules (coverage-gate, TSDoc-exports).

```bash
bun run check        # lint + tests
bun run spur-check   # lint + Spur pre-check + tests + Spur post-check
bun run check:full   # lint + tests (with snapshots)
```

All Spur rules are project-local (under `.spur/rules/`) and adapted to ts-base's multi-scaffold layout. Rules that govern runtime behavior (DB boundaries, TSDoc, output seams, test correspondence) cover all five source locations — `scripts/`, `src-app/`, `src-lib/`, `src-cli/`, and `src-monorepo/` — so the checks remain effective after a single mode is promoted.

Spur internals must not leak into generated end-user projects unless setup exposes an explicit option.

## `ts-base` vs `ts-libs`

Use this rule when convergence finds reusable code:

- Keep project-generation workflows, scaffolds, setup orchestration, agent skills, slash commands, and project-level conventions in `ts-base`.
- Move reusable runtime libraries, pure utilities, framework-agnostic components, shared validation helpers, reusable CLI primitives, and cross-project TypeScript modules to `~/xprojects/ts-libs`.
- Do not write to `ts-libs` from a convergence scan. Produce a `ts-libs-candidate` proposal and handle extraction in a separate confirmed task.

## Source Layout

```
scripts/
  ts-base.ts                  Unified CLI entrypoint (all subcommands)
  _modes.ts                   Mode-specific script blocks
  lib/
    logger.ts                 Structured-output logger (Bun.write, silent flag)
  divergence/                 Project setup modules
    setup.ts                  Template initializer (exported pure functions + integration runner)
    clean.ts                  Cache wiper
    test-setup.ts             Smoke-test orchestrator (injectable testEachMode)
    scaffold-install.ts       Workspace dep installer + @SCOPE symlink wiring
  agent-convergence/          Capability import modules
    types.ts                  Shared type definitions
    paths.ts                  Project-root-safe path resolution
    discovery.ts              Scan source projects for skills, commands, and configs
    classify.ts               Deterministic classification heuristics
    review.ts                 Build review artifacts with diffs + blocklists
    apply.ts                  Apply approved candidates with live re-classification
    capabilities.ts           Mode annotation, pruning, and symlink wiring
  fix-dist-esm-extensions.ts  Patch emitted dist/*.js for Node-compatible ESM (lib mode)
  smoke-dist-imports.ts       Verify built library imports resolve (lib mode)
tests/
  scripts/ -> ../scripts/tests   Symlink to satisfy Spur's require-corresponding-test convention
src-app/                      Application scaffold
src-lib/                      Library scaffold
src-cli/                      CLI workspace scaffold
src-monorepo/                 Monorepo scaffold
```

## Testing

Test files use `bun:test`. The `tests/scripts → ../scripts/tests` symlink satisfies Spur's `require-corresponding-test` path convention — source files at `scripts/divergence/<name>.ts` have corresponding tests at `tests/scripts/divergence/<name>.test.ts`.

Coverage target is line ≥ 90% and function ≥ 90% in aggregate. Tests that exercise output-producing code paths mute the logger via `logger.silent = true` to keep the terminal clean during test runs.

## Commands

| Command | Description |
| ------- | ----------- |
| `bun run setup`       | Choose and promote app/lib/cli/mono mode |
| `bun run clean`       | Remove generated caches from template scaffolds |
| `bun run test:setup`  | Smoke-test setup across all four modes |
| `bun run lint`        | Biome check (errors + warnings) + TypeScript typecheck |
| `bun run typecheck`   | TypeScript typecheck only |
| `bun run format`      | Biome autofix |
| `bun run autofix`     | Format then typecheck |
| `bun run test`        | Bun tests with coverage (165 tests across 51 files) |
| `bun run test:full`   | Tests with snapshot updates |
| `bun run check`       | Lint + tests |
| `bun run spur-check`  | Full quality gate: lint + Spur pre-check + tests + Spur post-check |

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

## Documentation Map

- `AGENTS.md` — coding-agent operating contract.
- `docs/00_ADR.md` — architecture decision record for this template/tooling direction.
- `docs/01_PRD.md` — product brief and scope.
- `docs/03_ARCHITECTURE.md` — architecture overview and design decisions.
- `docs/00_ADR-app.md`, `docs/00_ADR-lib.md`, `docs/00_ADR-cli.md`, `docs/00_ADR-mono.md` — mode-specific ADRs swapped during setup.

## Security

Never import secrets, `.env*`, credentials, private endpoints, tokens, or source-project-specific deployment configuration during convergence. Sensitive candidates are blocked even if listed in an approval artifact. The `converge apply` step re-classifies live source content to prevent TOCTOU bypasses.

See [SECURITY.md](SECURITY.md) for the security policy.

## License

Apache 2.0 — see [LICENSE](LICENSE).
