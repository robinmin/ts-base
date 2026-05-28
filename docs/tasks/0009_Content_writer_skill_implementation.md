---
name: Content writer skill implementation
description: Content writer skill implementation
status: Done
created_at: 2026-05-25T00:31:39.714Z
updated_at: 2026-05-25T01:25:45.128Z
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

## 0009. Content writer skill implementation

### Background

Skill stub exists at .claude/skills/content-writer/ but needs implementation per PRD §6.1.


### Requirements

- Implement content enhancement: structure improvement, cross-reference injection, action item flagging
- Analyze note structure (headings, paragraphs, links, tags)
- Suggest internal links based on vault content (use SQLite index when available)
- Flag incomplete sections, TODO items, orphan notes
- Must work as Claude Code skill
- PRD refs: §6.1


### Q&A



### Design

Implemented per PRD requirements with proper structure, validation, and file references.


### Solution

Implement content-writer SKILL.md with analysis heuristics, link suggestion logic, and structured output format.


### Plan

1. Implement per task requirements
2. Verify biome check + typecheck pass


### Review



### Testing



### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References


