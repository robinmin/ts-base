# Architecture Overview

## System Shape

`ts-base` has three major surfaces:

1. **Template scaffolds** — app, lib, cli, and mono source trees promoted by setup.
2. **Project tooling** — Bun scripts that initialize, verify, and converge project experience.
3. **Agent capability source** — canonical `.claude` skills and commands, exposed to other agents through symlinks or generated adapters.

## Divergence Flow

```text
package.json
scripts/setup.ts
src-app | src-lib | src-cli | src-monorepo
AGENTS-<mode>.md
docs/00_ADR-<mode>.md
        |
        v
generated single-mode project
```

`scripts/setup.ts` selects a mode, promotes the matching scaffold, swaps the mode-specific agent contract and ADR into place, moves workflows, removes unused scaffolds, and deletes template-only setup scripts.

## Convergence Flow

```text
source project
    |
    v
discover candidates
    |
    v
classify: generic | mode-specific | ts-libs-candidate | project-specific | sensitive | unknown
    |
    v
review artifact
    |
    v
explicit approval
    |
    v
apply canonical .claude content and adapters
```

Convergence is dry-run by default. Apply mode requires explicit candidate IDs and blocks sensitive candidates regardless of approval input. Mode-specific candidates are written with a `supported-modes` frontmatter annotation, and apply refreshes the `.agents/skills` adaptor symlink; `scripts/setup.ts` later prunes annotated capabilities that do not support the chosen mode.

## CLI Boundary

New convergence tooling uses one entrypoint:

```text
scripts/ts-base.ts
└── converge
    ├── scan
    ├── review
    └── apply
```

The CLI entrypoint owns argument parsing and output. Testable modules own discovery, classification, review rendering, and applying approved changes.

## Module Boundary

```text
scripts/
  ts-base.ts
  agent-convergence/
    types.ts
    paths.ts
    discovery.ts
    classify.ts
    review.ts
    apply.ts
```

- `types.ts` defines the stable review schema.
- `paths.ts` resolves project-root-safe paths.
- `discovery.ts` scans known agent capability locations.
- `classify.ts` applies deterministic safety and ownership heuristics.
- `review.ts` writes and renders review artifacts.
- `apply.ts` writes only explicitly approved candidates.

## Ownership Boundary

### `ts-base`

- Setup flow and mode scaffolds.
- Agent skills and slash commands.
- Template-level conventions.
- Convergence review/apply workflow.
- Documentation contracts.

### `ts-libs`

- Runtime abstractions.
- Pure utilities.
- Framework-agnostic reusable components.
- Shared validation helpers.
- Reusable CLI primitives.
- Workflow/rule engines and agent-runner libraries.

## Quality Boundary

`bun run lint` and `bun run test` are the base gate. `bun run spur-check` is the architecture/workflow quality harness for changes that affect project direction, convergence, or reusable rules.

## Security Boundary

Convergence treats source projects as untrusted input:

- Do not execute source-project commands.
- Do not import `.env*`, credentials, tokens, key files, or private endpoints.
- Do not follow symlinks that escape the source project unless explicitly allowed by future design.
- Do not write outside the `ts-base` project root during convergence.
