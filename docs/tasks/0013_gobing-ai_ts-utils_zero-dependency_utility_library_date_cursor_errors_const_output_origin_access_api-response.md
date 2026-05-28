---
name: "@gobing-ai/ts-utils — zero-dependency utility library (date, cursor, errors, const, output, origin, access, api-response)"
description: "@gobing-ai/ts-utils — zero-dependency utility library (date, cursor, errors, const, output, origin, access, api-response)"
status: Done
created_at: 2026-05-28T05:58:34.997Z
updated_at: 2026-05-28T19:59:03Z
folder: docs/tasks
type: task
feature-id: ""
priority: high
estimated_hours: 8
tags: ["package","utils","zero-dep"]
impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: completed
  testing: completed
---

## 0013. "@gobing-ai/ts-utils — zero-dependency utility library (date, cursor, errors, const, output, origin, access, api-response)"

### Background

The old `~/xprojects/spur/` project contains zero-dependency utility modules in `packages/core/src/` — date helpers, cursor encoding, structured error types, API response envelopes, access control, logging output, origin validation, and shared constants. These are all runtime-agnostic pure functions with no external dependencies, making them the ideal first package to extract.

Extracting them into `@gobing-ai/ts-utils` de-couples the infrastructure packages from the old codebase and gives the project a stable foundation layer. Every other package in the ts-libs monorepo will depend on this one.


### Requirements

- [x] Package configured for npm publishing as `@gobing-ai/ts-utils` (public, scoped); actual registry publish remains a release workflow action
- [x] Zero runtime dependencies — no external npm packages in `dependencies`
- [x] 100% TypeScript with strict mode, ESM only (`"type": "module"`)
- [x] Exports the following modules from a single barrel (`src/index.ts`):
  - `date.ts` — `fromMs`, `toMs`, `nowMs` (Date↔Unix ms conversion)
  - `cursor.ts` — `CursorData`, `encodeCursor`, `decodeCursor`, `parseCursor`, `createCursor`, `encodeCursorFromItem`, `decodeAndParseCursor`, `buildCursorMeta` (base64url cursor pagination)
  - `errors.ts` — `AppError`, `NotFoundError`, `ValidationError`, `ConflictError`, `InternalError`, `isAppError` type guard, local `ErrorCode` type/value; no import from `@spur/contracts`
  - `const.ts` — `LOG_CATEGORY_APP`, `LOG_CATEGORY_CLI` only; do not export Spur-specific file paths
  - `output.ts` — `echo`, `echoError`, `setDefaultOutputTargets`, `createBufferTarget` (structured stdout/stderr helpers), `WriteTarget`, `BufferTarget` types
  - `origin.ts` — `getValidatedOrigin`, `isAllowedOrigin`, `matchOriginPattern` (CORS origin validation)
  - `access.ts` — `getRoles`, `hasRole` (role-based access check)
  - `api-response.ts` — `ApiEnvelope<T>`, `ApiSuccessEnvelope<T>`, `ApiErrorEnvelope`, `API_ERROR_CODES`, `successResponse`, `errorResponse`, `paginatedResponse`, `notFoundResponse`, `validationErrorResponse`, `badRequestResponse`, `unauthorizedResponse`, `forbiddenResponse`, `conflictResponse`, `internalErrorResponse`, `infoResponse`
- [x] Tests ≥ 90% line + function coverage per file
- [x] Biome formatting + linting pass; `tsc --noEmit` clean



### Q&A



### Design

Implemented as a flat, zero-runtime-dependency utility package under `~/xprojects/ts-libs/packages/utils`.

Design choices:
- Keep each old Spur utility as a direct module with no package-barrel imports inside implementation files.
- Use extensioned relative imports (`./date.js`) so emitted ESM remains valid under bundler resolution.
- Define `ErrorCode` locally in `errors.ts` as both a runtime value and a TypeScript union type, removing the old `@spur/contracts` dependency.
- Trim `const.ts` to shared category constants only; no Spur-specific `LOG_FILE_PATH`.
- Keep output helpers injectable through `WriteTarget`/`BufferTarget` to preserve testability without touching global process streams.



### Solution

Extract the eight zero-dependency modules from `~/xprojects/spur/packages/core/src/` into a new package `packages/utils/` in the `~/xprojects/ts-libs` monorepo.

**Source mapping (spur → ts-libs):**

| spur (`packages/core/src/`) | ts-libs (`packages/utils/src/`) |
|---|---|
| `date.ts` | `date.ts` |
| `cursor.ts` | `cursor.ts` |
| `errors.ts` | `errors.ts` |
| `const.ts` | `const.ts` |
| `output.ts` | `output.ts` |
| `origin.ts` | `origin.ts` |
| `access.ts` | `access.ts` |
| `api-response.ts` | `api-response.ts` |

**Adaptations needed:**
- `const.ts`: remove `LOG_FILE_PATH` if it references a path that was spur-specific — keep only general-purpose constants
- `errors.ts`: remove the `@spur/contracts` dependency by defining the minimal library-owned `ErrorCode` contract locally; keep this package zero-dependency
- `api-response.ts`: keep as-is; it's a stand-alone typed envelope builder with no imports
- `cursor.ts`: it imports `toMs` from `date.ts`; keep this as a relative import with a `.js` specifier
- All internal imports: use extensioned relative specifiers (`./date.js`, etc.); do not import from the package barrel inside the package implementation

**Package structure:**
```
packages/utils/
├── package.json      # name: @gobing-ai/ts-utils, private: false
├── tsconfig.json     # extends ../../tooling/typescript/base.json
├── src/
│   ├── index.ts      # barrel re-export of all modules
│   ├── date.ts
│   ├── cursor.ts
│   ├── errors.ts
│   ├── const.ts
│   ├── output.ts
│   ├── origin.ts
│   ├── access.ts
│   └── api-response.ts
└── tests/
    ├── date.test.ts
    ├── cursor.test.ts
    ├── errors.test.ts
    ├── output.test.ts
    ├── origin.test.ts
    ├── access.test.ts
    └── api-response.test.ts
```

Tests are adapted from `~/xprojects/spur/packages/core/tests/` for the new import paths and Bun test runner, with an added `const.test.ts` because the old project did not have dedicated coverage for constants.

Actual implementation completed in `~/xprojects/ts-libs/packages/utils` with the planned module map. The package now exports all required utilities from `src/index.ts`, has `dependencies: {}`, and keeps `publishConfig.access = "public"`.


### Plan

1. Scaffold `packages/utils/` with package.json, tsconfig.json, src/index.ts barrel
2. Copy `date.ts` + `date.test.ts` → adapt imports, verify tests pass
3. Copy `cursor.ts` + `cursor.test.ts` → adapt imports, verify tests pass
4. Copy `errors.ts` + `errors.test.ts` → adapt imports, verify tests pass
5. Copy `const.ts` — review and trim spur-specific constants
6. Copy `output.ts` + `output.test.ts` → adapt imports, verify tests pass
7. Copy `origin.ts` + `origin.test.ts` → adapt imports, verify tests pass
8. Copy `access.ts` + `access.test.ts` → adapt imports, verify tests pass
9. Copy `api-response.ts` + `api-response.test.ts` → adapt imports, verify tests pass
10. Run package-level `bun run lint`, `bun run typecheck`, and `bun run test`; from the repo root also run `bun run check` if task 0017 created it
11. Mark task done


### Review

SECU review completed after implementation:

- Security: no external runtime dependencies added; origin matching remains string-based and avoids regex/ReDoS exposure.
- Encapsulation: package internals use relative module imports only; consumers use the public barrel.
- Correctness: behavior is covered against the extracted Spur test surface plus additional checks for `const.ts` and local `ErrorCode`.
- UX/API: public exports match the required module list and retain stable names.
- Drift prevention: actual npm publishing was not performed during implementation; package is release-ready through `publishConfig.access = "public"`.

Verification re-audit — 2026-05-28T19:59:03Z:

**Status:** PASS — 0 findings.
**Scope:** `~/xprojects/ts-libs/packages/utils`, task `0013`.
**Mode:** full verification, `--fix all --force`.
**Channel:** current.

### P1 — Blockers
| # | Title | Dimension | Location | Recommendation |
|---|-------|-----------|----------|----------------|
| - | None | - | - | - |

### P2 — Warnings
| # | Title | Dimension | Location | Recommendation |
|---|-------|-----------|----------|----------------|
| - | None | - | - | - |

### P3 — Info
| # | Title | Dimension | Location | Recommendation |
|---|-------|-----------|----------|----------------|
| - | None | - | - | - |

### P4 — Suggestions
| # | Title | Dimension | Location | Recommendation |
|---|-------|-----------|----------|----------------|
| - | None | - | - | - |

Static review checks:
- No hardcoded secret/key/token/password patterns in `packages/utils`.
- No unsafe dynamic execution, DOM injection, shell/process execution, or command execution surfaces in `packages/utils`.
- No `any`, `as any`, TypeScript ignore comments, or Biome suppressions in `packages/utils`.
- No stale `@spur/*` runtime imports in `packages/utils`.
- All internal source imports use `.js` specifiers.



### Testing

Verification run from `~/xprojects/ts-libs`:

- `bun run format` — passed; Biome fixed 1 formatting issue.
- `bun run lint` — passed; Biome clean and all workspace `tsc --noEmit` checks passed.
- `bun run test` — passed; `@gobing-ai/ts-utils` 43 tests, 126 assertions, 0 failures.
- `bun run build` — passed for all workspaces.
- `bun run check` — passed; combined lint/typecheck/test gate clean.

Coverage for `@gobing-ai/ts-utils`:

| File | Functions | Lines |
|---|---:|---:|
| All files | 100.00% | 99.26% |
| `src/access.ts` | 100.00% | 95.83% |
| `src/api-response.ts` | 100.00% | 100.00% |
| `src/const.ts` | 100.00% | 100.00% |
| `src/cursor.ts` | 100.00% | 98.21% |
| `src/date.ts` | 100.00% | 100.00% |
| `src/errors.ts` | 100.00% | 100.00% |
| `src/origin.ts` | 100.00% | 100.00% |
| `src/output.ts` | 100.00% | 100.00% |

Generated `dist/` artifacts were removed after build verification to keep the working tree pure TypeScript.

Re-verification run from `~/xprojects/ts-libs` on 2026-05-28T19:59:03Z:

- `bun run check` — passed; Biome clean, workspace typecheck clean, all tests pass.
- `bun run build` — passed for all workspaces.
- `@gobing-ai/ts-utils` coverage remained 100.00% functions / 99.26% lines, 43 tests, 126 assertions, 0 failures.
- Generated `dist/` artifacts were removed again after build verification.



### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |
| Source | `~/xprojects/ts-libs/packages/utils/src/date.ts` | Codex | 2026-05-28 |
| Source | `~/xprojects/ts-libs/packages/utils/src/cursor.ts` | Codex | 2026-05-28 |
| Source | `~/xprojects/ts-libs/packages/utils/src/errors.ts` | Codex | 2026-05-28 |
| Source | `~/xprojects/ts-libs/packages/utils/src/const.ts` | Codex | 2026-05-28 |
| Source | `~/xprojects/ts-libs/packages/utils/src/output.ts` | Codex | 2026-05-28 |
| Source | `~/xprojects/ts-libs/packages/utils/src/origin.ts` | Codex | 2026-05-28 |
| Source | `~/xprojects/ts-libs/packages/utils/src/access.ts` | Codex | 2026-05-28 |
| Source | `~/xprojects/ts-libs/packages/utils/src/api-response.ts` | Codex | 2026-05-28 |
| Tests | `~/xprojects/ts-libs/packages/utils/tests/*.test.ts` | Codex | 2026-05-28 |

### References
