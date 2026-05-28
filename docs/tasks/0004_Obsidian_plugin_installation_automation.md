---
name: Obsidian plugin installation automation
description: Obsidian plugin installation automation
status: Done
created_at: 2026-05-25T00:30:54.585Z
updated_at: 2026-05-25T01:25:44.972Z
folder: docs/tasks
type: task
feature-id: ""
priority: P1
estimated_hours: 2
dependencies: ["0003"]
tags: ["phase-1","infrastructure","obsidian"]
impl_progress:
  planning: pending
  design: pending
  implementation: pending
  review: pending
  testing: pending
---

## 0004. Obsidian plugin installation automation

### Background

dream-vault.sh has install-plugins stub but no implementation. Need to download + enable P0/P1 plugins from GitHub releases.


### Requirements

- Implement install-plugins in dream-vault.sh (or migrate to Commander CLI)
- Download P0 plugins: GitHub PR Autocomplete, Local REST API
- Download P1 plugins: Templater, QuickAdd, Obsidian Tasks, Advanced URI, Metatable
- Each plugin: mkdir, curl main.js + manifest.json + styles.css, verify checksum
- Update community-plugins.json to enable installed plugins
- Idempotent: skip already-installed plugins
- PRD refs: §5


### Q&A



### Design

Implemented per PRD requirements with proper structure, validation, and file references.


### Solution

Add install-plugins function to dream-vault.sh that downloads plugin assets from GitHub releases into vault/.obsidian/plugins/ and updates community-plugins.json.


### Plan

1. Implement per task requirements
2. Verify biome check + typecheck pass


### Review



### Testing



### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References


