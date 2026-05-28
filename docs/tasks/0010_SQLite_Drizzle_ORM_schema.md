---
name: SQLite + Drizzle ORM schema
description: SQLite + Drizzle ORM schema
status: Done
created_at: 2026-05-25T00:31:51.703Z
updated_at: 2026-05-25T01:18:06.498Z
folder: docs/tasks
type: task
feature-id: ""
priority: P1
estimated_hours: 2
dependencies: ["0001"]
tags: ["phase-3","data","sqlite"]
impl_progress:
  planning: pending
  design: pending
  implementation: pending
  review: pending
  testing: pending
---

## 0010. SQLite + Drizzle ORM schema

### Background

Need local structured data layer for vault metadata, search index, and sync status per ADR-008 tech stack.


### Requirements

- Define Drizzle schema for: notes (path, title, frontmatter JSON, modified_at, word_count), frontmatter_cache (parsed YAML fields), sync_status (last_sync, status), search_index (FTS5)
- Zod schemas mirroring DB types for validation at boundaries
- Drizzle migration files
- DB file: vault/.dream-vault/metadata.db (gitignored)
- Export: schema, migrate function, query helpers
- PRD refs: §1 Tech Stack, ADR-008


### Q&A



### Design

- 5 tables: notes, frontmatter_cache, sync_status, attachments, notes_fts (FTS5)
- Drizzle ORM schema in src/db/schema.ts with proper relations and indexes
- Zod validation schemas in src/db/schemas.ts mirroring all DB types + SEO frontmatter schema
- DB init with WAL mode, foreign keys ON, auto-create .dream-vault/ dir
- Dev fallback: createTables() when no migration files
- Drizzle migration generated: drizzle/0000_quick_gambit.sql
- drizzle.config.ts pointing to vault/.dream-vault/metadata.db
- All files pass biome check + tsc --noEmit


### Solution

Create src/db/ with Drizzle schema, migrations, Zod validation, and SQLite initialization.


### Plan

1. Create src/db/schema.ts with 5 Drizzle table definitions
2. Create src/db/schemas.ts with Zod validation schemas + SEO frontmatter
3. Create src/db/index.ts with initDb, runMigrations, createTables
4. Create drizzle.config.ts
5. Create src/db/mod.ts barrel export
6. Run bun run db:generate to create initial migration
7. Verify: bun run check + bun run typecheck pass


### Review



### Testing



### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References


