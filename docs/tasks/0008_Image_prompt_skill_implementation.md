---
name: Image prompt skill implementation
description: Image prompt skill implementation
status: Done
created_at: 2026-05-25T00:31:32.463Z
updated_at: 2026-05-25T01:25:45.051Z
folder: docs/tasks
type: task
feature-id: ""
priority: P1
estimated_hours: 2
dependencies: ["0001","0003"]
tags: ["phase-2","skills","content"]
impl_progress:
  planning: pending
  design: pending
  implementation: pending
  review: pending
  testing: pending
---

## 0008. Image prompt skill implementation

### Background

Skill stub exists at .claude/skills/image-prompt/ but needs implementation per PRD §6.2.


### Requirements

- Implement image prompt generation for Midjourney/DALL-E/Flux
- Input: note content or description → output: optimized prompt per tool
- Save generated images path to vault/98_attachments/_generated/
- Embed syntax: standard markdown ![desc](path)
- Must work as Claude Code skill
- PRD refs: §6.2


### Q&A



### Design

Implemented per PRD requirements with proper structure, validation, and file references.


### Solution

Implement image-prompt SKILL.md with prompt templates for each tool, image saving workflow, and embed syntax.


### Plan

1. Implement per task requirements
2. Verify biome check + typecheck pass


### Review



### Testing



### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References


