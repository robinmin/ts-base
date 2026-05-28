---
name: "GitHub Actions: vault-r2-sync.yml (R2 backup)"
description: "GitHub Actions: vault-r2-sync.yml (R2 backup)"
status: Done
created_at: 2026-05-25T00:31:11.468Z
updated_at: 2026-05-25T01:18:34.653Z
folder: docs/tasks
type: task
feature-id: ""
priority: P0
estimated_hours: 1.5
dependencies: ["0005"]
tags: ["phase-1","infrastructure","ci-cd","r2"]
impl_progress:
  planning: pending
  design: pending
  implementation: pending
  review: pending
  testing: pending
---

## 0006. "GitHub Actions: vault-r2-sync.yml (R2 backup)"

### Background

No R2 sync workflow exists. Need automated Cloudflare R2 backup on push to main.


### Requirements

- Create .github/workflows/vault-r2-sync.yml per PRD §8.2
- Trigger: push to main, paths vault/**
- Use aws s3 sync with --delete
- All credentials from GitHub Secrets (CLOUDFLARE_R2_ACCOUNT_ID, ACCESS_KEY_ID, SECRET_ACCESS_KEY, BUCKET_NAME)
- Endpoint URL parametrized from secrets
- Add sync summary output (files added/removed)
- PRD refs: §8.1, §8.2, ADR-002, ADR-006


### Q&A



### Design

- Triggers on push to main with vault/** paths
- Uses aws s3 sync with --delete for mirror sync
- All 4 credentials from GitHub Secrets (ACCOUNT_ID, ACCESS_KEY_ID, SECRET_ACCESS_KEY, BUCKET_NAME)
- Endpoint URL constructed from secret, never hardcoded
- --no-follow-symlinks to avoid leaking system files
- Summary step with GitHub Actions grouping for log readability


### Solution

Create R2 sync workflow using AWS CLI with Cloudflare R2 endpoint. All creds from GitHub Secrets.


### Plan

1. Create .github/workflows/vault-r2-sync.yml per PRD §8.2
2. Parametrize bucket name + account ID from secrets
3. Add sync summary output step


### Review



### Testing



### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References


