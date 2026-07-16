---
description: Post-convergence: review, cleanup, and integrate absorbed capabilities
argument-hint: "--from [source-project] --description [what-was-absorbed] [review-artifact]"
---

You are finishing a convergence cycle. Copy candidates may have been written by `converge apply`; review-only code candidates are metadata evidence and are never copied by apply.

ARGUMENTS supplies the source project path (`--from`), a description of what was absorbed and any special instructions (`--description`), and optionally the review artifact path. Read `$ARGUMENTS` to extract these values.

## 0. Understand what happened

Parse the arguments:

- `--from <source-project>` — the source project the convergence scanned. Required.
- `--description <text>` — what was absorbed (skills, commands, configs, code), why, and any cleanup preferences or constraints. Required.
- `[review-artifact]` — path to the review JSON from `converge review`. Optional; if omitted, infer from the most recent file in `docs/reviews/`.

If any required argument is missing, ask for it before proceeding.

## 1. Review what was absorbed

- If a review artifact was provided or found, read it to understand the classification decisions.
- Branch by `discoveryStrategy`:
  - `copy`: run `git status -s` to inspect files created or modified by apply.
  - `review-only`: do not use `git status` as evidence of discovery. Read the metadata table, source digest, extraction target, and tracking state. `converge apply` wrote no code.
- For each new or changed file, check whether it contains project-specific references that should have been classified as `project-specific` or `sensitive`:
  - Absolute paths pointing to the source project's directory
  - Organization names, cloud account IDs, or deployment targets
  - Hardcoded secrets, tokens, or internal endpoints
  - References to source-project-only packages or tooling

## 2. Clean up drift

For every file flagged above:

- Replace source-project names/paths with `ts-base` equivalents.
- Strip or generalize deployment targets, account IDs, and cloud-specific config.
- If a file is too entangled with the source project to generalize, classify it as blocked and remove it. Do NOT leave half-cleaned files in the tree.

Apply any additional instructions from `--description`.

For each review-only code candidate, require one explicit tracking decision: `approved`, `ported`, `rejected`, or `deferred`. Keep the decision in the separate code-port tracking document; never edit the immutable scan artifact. If an approved candidate is adapted, open that source file explicitly, hand-port one surgical seam, and run the owning repository gates. A changed `sourceDigest` means `needs-review` regardless of its prior state.

## 3. Verify capability registration

- Every new `.claude/skills/<name>/SKILL.md` must be discoverable. Verify the skill directory exists with a `SKILL.md` and that its frontmatter is valid.
- Every new `.claude/commands/<name>.md` must follow the project's command format.
- If an absorbed capability is mode-scoped, confirm it carries a `supported-modes` frontmatter annotation listing the modes it supports.

## 4. Wire adaptors

- Run the relevant subcommand to re-wire `.agents/skills` if the absorbed capability changes the symlink surface.
- Verify the symlink is intact: `ls -la .agents/skills` should point to `.claude/skills`.

## 5. Run verification gates

After all cleanup and wiring:

```bash
bun run lint
bun run test
bun run spur-check   # if convergence rules or architecture changed
```

Fix every failure at its root cause. No `biome-ignore` suppressions to silence the gate. No `.skip` on failing tests.

## 6. Commit

When gates are green:

- Stage only the absorbed + cleaned files. Do NOT stage unrelated changes.
- Use a conventional commit: `feat(converge): absorb <what> from <source>`
- If any absorbed file was blocked or removed, note it in the commit body.

## 7. Handoff

Report:

- Source: the `--from` project
- Files absorbed: count + list
- Files blocked/removed: count + list + reason
- Gate results: all pass / failures fixed
- Commit hash
