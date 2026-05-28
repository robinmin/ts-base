---
name: "@gobing-ai/ts-utils — zero-dependency utility library (date, cursor, errors, const, output, origin, access, api-response)"
description: "@gobing-ai/ts-utils — zero-dependency utility library (date, cursor, errors, const, output, origin, access, api-response)"
status: Backlog
created_at: 2026-05-28T05:58:34.997Z
updated_at: 2026-05-28T05:58:34.997Z
folder: docs/tasks
type: task
feature-id: ""
priority: high
estimated_hours: 8
tags: ["package","utils","zero-dep"]
impl_progress:
  planning: pending
  design: pending
  implementation: pending
  review: pending
  testing: pending
---

## 0013. "@gobing-ai/ts-utils — zero-dependency utility library (date, cursor, errors, const, output, origin, access, api-response)"

### Background

The old `~/xprojects/spur/` project contains zero-dependency utility modules in `packages/core/src/` — date helpers, cursor encoding, structured error types, API response envelopes, access control, logging output, origin validation, and shared constants. These are all runtime-agnostic pure functions with no external dependencies, making them the ideal first package to extract.

Extracting them into `@gobing-ai/ts-utils` de-couples the infrastructure packages from the old codebase and gives the project a stable foundation layer. Every other package in the ts-libs monorepo will depend on this one.


### Requirements

- [ ] Package published to npm as `@gobing-ai/ts-utils` (public, scoped)
- [ ] Zero runtime dependencies — no external npm packages in `dependencies`
- [ ] 100% TypeScript with strict mode, ESM only (`"type": "module"`)
- [ ] Exports the following modules from a single barrel (`src/index.ts`):
  - `date.ts` — `fromMs`, `toMs`, `nowMs` (Date↔Unix ms conversion)
  - `cursor.ts` — `encodeCursor`, `decodeCursor`, `parseCursor`, `createCursor`, `encodeCursorFromItem`, `buildCursorMeta` (base64url cursor pagination)
  - `errors.ts` — `AppError`, `NotFoundError`, `ValidationError`, `ConflictError`, `InternalError`, `isAppError` type guard, `ErrorCode` type
  - `const.ts` — `LOG_CATEGORY_APP`, `LOG_CATEGORY_CLI`, `LOG_FILE_PATH` (shared constants)
  - `output.ts` — `echo`, `echoError` (structured stdout/stderr helpers), `WriteTarget` type
  - `origin.ts` — `getValidatedOrigin`, `isAllowedOrigin`, `matchOriginPattern` (CORS origin validation)
  - `access.ts` — `getRoles`, `hasRole` (role-based access check)
  - `api-response.ts` — `ApiEnvelope<T>`, `ApiSuccessEnvelope<T>`, `ApiErrorEnvelope`, `API_ERROR_CODES`, `successResponse`, `errorResponse`, `paginatedResponse`, `notFoundResponse`, `validationErrorResponse`, `badRequestResponse`, `unauthorizedResponse`, `forbiddenResponse`, `conflictResponse`, `internalErrorResponse`, `infoResponse`
- [ ] Tests ≥ 90% line + function coverage per file
- [ ] Biome formatting + linting pass; `tsc --noEmit` clean



### Q&A



### Design



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
- `api-response.ts`: keep as-is; it's a stand-alone typed envelope builder with no imports
- `cursor.ts`: depends on no other module; keep as-is
- All modules: replace any `@starter/core` imports with `@gobing-ai/ts-utils` (re-exports within the barrel)

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

Tests are copied from `~/xprojects/spur/packages/core/tests/` and adapted for the new import paths and Bun test runner (the old project used vitest).


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
10. Run `bun run check` (Biome + tsc + test), verify ≥90% coverage
11. Mark task done


### Review



### Testing



### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References


