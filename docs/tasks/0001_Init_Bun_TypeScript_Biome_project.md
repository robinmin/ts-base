---
name: Init Bun + TypeScript + Biome project
description: Init Bun + TypeScript + Biome project
status: Done
created_at: 2026-05-25T00:30:25.538Z
updated_at: 2026-05-25T00:36:37.369Z
folder: docs/tasks
type: task
feature-id: ""
priority: P0
estimated_hours: 0.5
tags: ["phase-0","foundation"]
impl_progress:
  planning: pending
  design: pending
  implementation: pending
  review: pending
  testing: pending
---

## 0001. Init Bun + TypeScript + Biome project

### Background

Project needs canonical tech stack scaffolded (ADR-008): Bun runtime, TypeScript strict mode, Biome lint+format.


### Requirements

- package.json with Bun, TypeScript, Biome, Zod, LogTape, Drizzle ORM, Commander as deps
- tsconfig.json with strict mode, ESNext target
- biome.json with lint+format rules
- src/ directory structure: src/cli/, src/db/, src/skills/, src/utils/
- Verify: bun run check (biome lint+typecheck) passes on empty scaffold
- PRD refs: §1 Tech Stack Constraint, §12 Next Steps


### Q&A



### Design

- Bun project scaffold with package.json (8 deps, 4 devDeps)
- biome.json v2.4.15 schema, tab indent, double quotes, 100 line width
- tsconfig.json strict mode, ESNext, bundler moduleResolution, path alias @/*
- src/ module skeleton: cli/, db/, skills/, utils/
- LogTape configured with pretty formatter, "dream-vault" category


### Solution

Scaffold Bun project with all 8 canonical dependencies. Configure Biome as unified lint+format. Create src/ module skeleton. Wire bun scripts for check/lint/format.


### Plan

1. `bun init -y` to scaffold base
2. Install all 8 canonical deps + dev deps
3. Write biome.json, tsconfig.json configs
4. Create src/ skeleton with logger utility
5. Verify: `bun run check` + `bun run typecheck` pass


### Review



### Testing



### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References


