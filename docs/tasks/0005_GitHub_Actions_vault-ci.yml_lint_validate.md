---
name: "GitHub Actions: vault-ci.yml (lint + validate)"
description: "GitHub Actions: vault-ci.yml (lint + validate)"
status: Done
created_at: 2026-05-25T00:31:02.961Z
updated_at: 2026-05-25T01:14:04.185Z
folder: docs/tasks
type: task
feature-id: ""
priority: P0
estimated_hours: 1.5
dependencies: ["0001","0003"]
tags: ["phase-1","infrastructure","ci-cd"]
impl_progress:
  planning: pending
  design: pending
  implementation: pending
  review: pending
  testing: pending
---

## 0005. "GitHub Actions: vault-ci.yml (lint + validate)"

### Background

No CI workflow exists. Need markdown lint and attachment validation on push to main.


### Requirements

- Create .github/workflows/vault-ci.yml per PRD §8.3
- Trigger: push to main, paths vault/**
- Steps: checkout, setup Bun (ADR-008), markdownlint-cli2, attachment validation script
- Use portable grep (no Perl regex)
- Add .markdownlint.json config for vault-specific rules
- PRD refs: §8.1, §8.3


### Q&A



### Design

- vault-ci.yml triggers on push/PR to main with vault/** paths
- Uses oven-sh/setup-bun@v2 (ADR-008)
- 3 validation steps: markdownlint-cli2, attachment reference check, public note frontmatter check
- Attachment check skips http/mailto/obsidian URIs
- Uses GitHub Actions annotation syntax (::error, ::warning) for CI integration
- Frontmatter validation warns (not fails) for missing title/date in public notes


### Solution

Create CI workflow with Bun setup, markdownlint, and shell-based attachment validation per PRD spec.


### Plan

1. Create .github/workflows/ directory
2. Write vault-ci.yml with Bun setup + markdownlint + attachment validation + frontmatter check
3. Use portable grep -oE (no Perl regex)
4. Add PR trigger in addition to push for pre-merge validation


### Review



### Testing



### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References


