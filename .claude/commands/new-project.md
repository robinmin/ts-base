---
description: Post-setup: customize, verify, and finalize a new project from ts-base
argument-hint: "--mode [app|lib|cli|mono] --name [project-name] --description [what-this-project-does]"
---

You are finishing the project-creation workflow. `bun run setup` (or `scripts/ts-base.ts setup`) has just promoted the selected mode scaffold. The template files have been moved into place, unused scaffolds deleted, and mode-specific AGENTS/ADR files swapped in.

ARGUMENTS supplies the mode (`--mode`), the new project name (`--name`), and a description of what the project does plus any special customization instructions (`--description`). Read `$ARGUMENTS` to extract these values.

## 0. Understand the project

Parse the arguments:

- `--mode <app|lib|cli|mono>` — which mode was promoted by setup. Required. If omitted, infer from the remaining `src/` structure or `AGENTS.md`.
- `--name <project-name>` — the new project's name. For cli/mono modes this should be scoped (`@org/project`). Required.
- `--description <text>` — what this project does, its domain, and any customization preferences or constraints. Required.

If any required argument is missing, ask for it before proceeding.

## 1. Verify the setup result

```bash
git status -s
```

Confirm that only the expected changes are present:

- `src-app/`, `src-lib/`, `src-cli/`, `src-monorepo/` are gone except the chosen mode's `src/` directory.
- `AGENTS.md` and `docs/00_ADR.md` reflect the selected mode.
- `package.json` scripts are wired for the mode.
- Removable template scripts (`setup.ts`, `clean.ts`, etc.) are deleted from `scripts/`.

If something looks wrong — scaffolds not deleted, wrong AGENTS file, wrong scripts — diagnose and fix before proceeding.

## 2. Customize project identity

Set `package.json` fields:

- `name` — `$2` (the `--name` argument). For cli/mono modes, replace any remaining `@SCOPE/` placeholders in source files, configs, and documentation with the real scope derived from the scoped name.
- `description` — the `--description` argument.
- `version` — `0.0.0` (or a different starting version if `--description` specifies one).
- Remove fields that don't apply (e.g., `private: true` for a public library).

## 3. Update project documentation

- `AGENTS.md` — review the mode-specific agent contract. Update project name, stack details, and any placeholder conventions using information from `--name` and `--description`.
- `docs/00_ADR.md` — confirm the architecture decisions match. Remove mode-specific ADR variants that were not promoted.
- `README.md` — replace the ts-base README with project-specific content: what the project does (from `--description`), how to set it up, how to contribute.

## 4. Prune unused capabilities

The setup step prunes `.claude/skills/` entries whose `supported-modes` annotation excludes the chosen mode. Verify:

```bash
ls .claude/skills/
ls .claude/commands/
```

Remove any remaining skill or command that is irrelevant to this project's domain. Every capability left in the tree should serve a purpose. Use the `--description` to guide relevance decisions.

## 5. Install and verify

```bash
proto use
bun install
bun run check
```

Fix every failure. The project must pass lint, typecheck, and tests before it is ready.

Mode-specific extras:

- **lib**: `bun run build && bun run smoke:dist`
- **cli / mono**: `bun run build` (turbo across all workspaces)

## 6. Initialize Git

If this is a fresh checkout (not a clone of ts-base):

```bash
rm -rf .git
git init
git add -A
git commit -m "chore: initial project setup from ts-base"
```

If this is still in the ts-base repository (a mode test), skip this step.

## 7. Handoff

Report:

- Mode: which was promoted
- Project: the `--name` and `--description`
- Customizations: package.json fields updated, scope replacements done
- Capabilities: count of skills/commands retained vs. pruned
- Gate results: `bun run check` passes (or failures + fixes)
- Next steps: anything the developer should do manually (secrets, deployment config, CI setup)
