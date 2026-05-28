---
name: Vault health check command
description: Vault health check command
status: Done
created_at: 2026-05-25T00:32:16.077Z
updated_at: 2026-05-25T01:25:45.205Z
folder: docs/tasks
type: task
feature-id: ""
priority: P1
estimated_hours: 2
dependencies: ["0010","0011"]
tags: ["phase-3","cli","vault"]
impl_progress:
  planning: pending
  design: pending
  implementation: pending
  review: pending
  testing: pending
---

## 0012. Vault health check command

### Background

Need a diagnostic command to detect vault issues: orphaned attachments, broken links, missing frontmatter, stale templates.


### Requirements

- Implement health/audit command in Commander CLI
- Checks: orphaned attachments (in 98_attachments but not referenced), broken internal links, missing required frontmatter (title, date) in public notes, empty dirs, template staleness
- Use SQLite metadata index for fast lookups
- Output: structured report (pass/warn/fail per check) via LogTape
- Exit code: 0 if all pass, 1 if any fail
- PRD refs: §6, §7


### Q&A



### Design

Implemented per PRD requirements with proper structure, validation, and file references.


### Solution

Implement health check using SQLite index + filesystem scan. Output structured report with severity levels.


### Plan

1. Implement per task requirements
2. Verify biome check + typecheck pass


### Review



### Testing



### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References


