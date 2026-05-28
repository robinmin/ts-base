---
name: SEO optimizer skill implementation
description: SEO optimizer skill implementation
status: Done
created_at: 2026-05-25T00:31:20.569Z
updated_at: 2026-05-25T01:20:04.450Z
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

## 0007. SEO optimizer skill implementation

### Background

Skill stub exists at .claude/skills/seo-optimizer/ but needs implementation per PRD §7.


### Requirements

- Implement SEO analysis logic: title <60 chars, description <160 chars, keyword suggestions, internal link detection
- Zod schema for frontmatter validation (title, description, keywords, publish, date, author, image, og_type)
- Output: structured report with pass/fail per check + fix suggestions
- Must work as Claude Code skill (SKILL.md with instructions)
- PRD refs: §7.1, §7.2


### Q&A



### Design

- Enhanced SKILL.md with PASS/WARN/FAIL validation rules for all frontmatter fields
- Structured output format: table report + suggested changes
- Content analysis: word count, heading structure, internal/external links, images
- Keyword suggestion from content frequency analysis
- Internal link suggestions by matching note topics
- References Zod seoFrontmatterSchema from src/db/schemas.ts


### Solution

Implement seo-optimizer SKILL.md with Zod frontmatter schema, validation checks, and fix suggestions.


### Plan

1. Rewrite SKILL.md with structured validation rules
2. Add PASS/WARN/FAIL criteria per field
3. Add content analysis checks (word count, headings, links)
4. Add output format template
5. Wire Zod schema reference


### Review



### Testing



### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References


