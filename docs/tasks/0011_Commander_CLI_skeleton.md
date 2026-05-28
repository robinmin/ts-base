---
name: Commander CLI skeleton
description: Commander CLI skeleton
status: Done
created_at: 2026-05-25T00:32:04.138Z
updated_at: 2026-05-25T01:23:19.108Z
folder: docs/tasks
type: task
feature-id: ""
priority: P1
estimated_hours: 3
dependencies: ["0001","0010"]
tags: ["phase-3","cli","migration"]
impl_progress:
  planning: pending
  design: pending
  implementation: pending
  review: pending
  testing: pending
---

## 0011. Commander CLI skeleton

### Background

dream-vault.sh is functional but will hit expressiveness limits. Commander CLI migration per ADR-008.


### Requirements

- src/cli/index.ts: Commander-based CLI wrapping dream-vault.sh functionality
- Commands: install (basic/skills/plugins/structure), publish, status, health, help
- LogTape structured logging throughout
- Zod validation for CLI args
- Bun shebang + bin entry in package.json
- Keep dream-vault.sh as fallback; CLI calls shell for install ops initially
- PRD refs: §1 Tech Stack, ADR-004, ADR-008


### Q&A



### Design

- Commander CLI with 5 commands: install, publish, status, health, db:init
- src/cli/index.ts: program definition with LogTape integration, delegates to dream-vault.sh for shell ops
- src/cli/health.ts: 4 health checks (orphaned attachments, missing frontmatter, broken links, empty dirs)
- src/cli/bin.ts: Bun shebang entry point
- All pass biome check + tsc --noEmit


### Solution

Scaffold Commander CLI with subcommands, LogTape logging, and Zod arg validation. Wire as bin in package.json.


### Plan

1. Create src/cli/index.ts with Commander program + 5 subcommands
2. Create src/cli/health.ts with 4 filesystem-based health checks
3. Create src/cli/bin.ts entry point
4. Wire LogTape + DB integration
5. Auto-fix biome formatting


### Review



### Testing



### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References


