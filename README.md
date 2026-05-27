# 🚀 ts-base

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue.svg)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.3-orange.svg)](https://bun.sh/)
[![Biome](https://img.shields.io/badge/Biome-2.4-green.svg)](https://biomejs.dev/)

A modern, production-ready TypeScript starter wired up with Bun, Biome, Git hooks, and conventional commits. Pick **application**, **library**, or **monorepo** mode at setup — clone it and start building.

## ✨ Stack

- **[Bun](https://bun.sh/)** — runtime, package manager, and test runner
- **[TypeScript](https://www.typescriptlang.org/)** — ESNext, strict mode
- **[Biome](https://biomejs.dev/)** — linter + formatter (replaces ESLint & Prettier)
- **[Lefthook](https://github.com/evilmartians/lefthook)** — Git hooks
- **[Cocogitto](https://github.com/cocogitto/cocogitto)** — conventional commits + changelog
- **[proto](https://moonrepo.dev/proto)** — pins every tool version via `.prototools`

## 🚀 Quick Start

### Install tools and dependencies

With [proto](https://moonrepo.dev/proto) (recommended — installs the exact tool versions from `.prototools`):

```bash
# Install proto if you don't have it
bash -c "$(curl -fsSL https://moonrepo.dev/install/proto.sh)"
```

### Initialize project

```bash
# Scaffold from the template
PROJECT_NAME=my-project
bunx degit robinmin/ts-base $PROJECT_NAME && cd $PROJECT_NAME

# Pick a mode: application (Bun.serve server), library (publishable package),
# or monorepo (Turborepo + Bun workspaces). Flat modes rename the chosen src-*/
# folder to src/; monorepo mode promotes src-monorepo/ to the root. The unused
# scaffolds are removed, the matching scripts/deps/CI are wired up, then setup
# deletes itself.
bun run setup            # interactive prompt
# bun run setup --mode=app   # or --mode=lib | --mode=mono, non-interactive

# Install bun, biome, cog, lefthook + project deps + Git hooks
proto use && bun install
```

### Run

```bash
# Application mode
bun run dev     # dev server with file watching
bun run start   # production server

# Library mode
bun run build   # bundle to dist/ via tsdown
bun run dev     # rebuild on change

# Monorepo mode (turbo fans each task out across all workspaces)
bun run dev     # run every app's dev task in parallel
bun run build   # build all workspaces
bun run test    # test all workspaces
```

## 🛠️ Scripts

Shared by every mode:

| Script            | Description                          |
|-------------------|--------------------------------------|
| `bun run test`    | Run tests with coverage              |
| `bun run lint`    | Biome check + `tsc --noEmit`         |
| `bun run format`  | Auto-fix and format with Biome       |
| `bun run autofix` | Format then type-check               |
| `bun run prepare` | Install Lefthook Git hooks           |

Application mode adds `start` / `dev` (Bun server). Library mode adds `build` / `dev` (tsdown) and `size` (size-limit). Monorepo mode routes `dev` / `build` / `test` / `typecheck` through `turbo run …` across all workspaces.

## 🪝 Git Hooks & Conventional Commits

Lefthook runs quality checks automatically:

- **pre-commit** — format, lint, type-check
- **commit-msg** — validate the message
- **pre-push** — final lint + type-check

Commit messages must follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
git commit -m "feat: add user authentication"
git commit -m "fix: resolve memory leak in data processing"
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`. Breaking changes go in a `BREAKING CHANGE:` footer.

## 🧰 Type Utilities

`src/types.ts` ships `Prettify<T>`, which flattens intersections and mapped types into a single object literal so editor tooltips read `{ a: string; b: number }` instead of `A & B`. It is compile-time only and emits no runtime code.

```ts
import type { Prettify } from "./types.js";

type Result = { a: string } & { b: number };
type PrettyResult = Prettify<Result>; // hovers as { a: string; b: number }
```

## 🍳 Recipes (application mode)

The default app is an intentionally minimal `Bun.serve` server. Two common upgrades:

### Database — Bun native SQL

`src-app/db.example.ts` is a zero-dependency reference using Bun's built-in SQL
client (`import { SQL } from "bun"`). Tagged-template queries are parameterized,
so they are injection-safe by default. Rename it to `db.ts`, adapt the schema,
and set `$DATABASE_URL`. Delete the file if you don't need a database. See the
[Bun SQL docs](https://bun.sh/docs/api/sql).

### Routing — swap in Hono

For anything beyond a couple of routes, replace the `fetch` handler in
`src/index.ts` with [Hono](https://hono.dev/) (routing, middleware, validation):

```ts
import { Hono } from "hono";
import { config } from "./config.js";

const app = new Hono();
app.get("/health", (c) => c.json({ status: "ok" }));

export default { port: config.port, fetch: app.fetch };
```

Then `bun add hono`. Hono runs natively on `Bun.serve` and stays edge-portable.

## 📁 Project Structure

Before `bun run setup` the template ships all three modes side by side:

```
├── src-app/              # application mode (kept if you pick "app")
│   ├── index.ts          #   Bun.serve entry point
│   ├── config.ts         #   convict-based configuration
│   ├── db.example.ts     #   optional Bun native SQL reference (rename or delete)
│   ├── types.ts          #   shared type utilities (Prettify)
│   └── tests/
├── src-lib/              # library mode (kept if you pick "lib")
│   ├── internal.ts       #   runtime-agnostic core
│   ├── index.ts          #   Node/Bun entry (node:crypto)
│   ├── browser.ts        #   browser entry (Web Crypto)
│   ├── types.ts          #   shared type utilities (Prettify)
│   └── tests/
├── src-monorepo/         # monorepo mode (promoted to root if you pick "mono")
│   ├── apps/
│   │   ├── server/       #   Hono on Bun.serve
│   │   ├── web/          #   Vite + React 19
│   │   └── cli/          #   Bun CLI
│   ├── packages/
│   │   ├── api/          #   shared logic + types (consumed by server & web)
│   │   ├── config/       #   convict configuration
│   │   ├── db/           #   Bun native SQL
│   │   └── utils/        #   shared utilities + type helpers
│   ├── tooling/typescript/ # shared tsconfig presets
│   └── turbo.json        #   Turborepo task graph
├── scripts/setup.ts      # one-shot mode picker (self-deletes)
├── .github/workflows-*/  # per-mode CI (one is installed by setup)
├── tsdown.config.ts      # library bundler config (lib mode only)
├── biome.json            # Biome configuration
├── tsconfig.json         # TypeScript configuration (flat modes)
├── .prototools           # pinned tool versions
└── package.json
```

After setup, the flat modes rename the chosen folder to `src/` and remove the
others; monorepo mode promotes `src-monorepo/`'s contents to the root and rewrites
the `@SCOPE/` placeholder to your project's scope. The mode-specific scripts,
deps, and CI are wired into `package.json` and `.github/workflows/`.

## 📋 Customization

1. Run `bun run setup` to choose application, library, or monorepo mode.
2. Update `name` and metadata in `package.json` (the monorepo derives its `@scope/` from the root name).
3. Replace `src/` (or the `apps/` + `packages/` workspaces) with your own code.
4. Adjust `tsconfig.json` / `biome.json` as needed.
5. Rewrite this README for your project.

## 🧹 Post-Initialization Cleanup

`bun run setup` handles all structural cleanup: removes unused modes, deletes
itself, installs the matching CI, and optionally strips the database example or
convict config via flags.

Use `bun run setup --mode=app --no-db` to skip the Bun SQL sample, or
`--no-convict` to drop config validation. For more complex trimming (monorepo
workspaces, etc.), do it by hand after setup.

What's left is **your** project now — replace the sample code, rewrite this
README, and adjust the remaining config to fit.

## 🔒 Security

See [SECURITY.md](SECURITY.md) for the security policy and how to report vulnerabilities.

## 📄 License

Apache 2.0 — see [LICENSE](LICENSE).

## References

- Forked from [tabmadi/ts-template](https://github.com/tabmadi/ts-template)
- [bgub/ts-base](https://github.com/bgub/ts-base)
- [SamJbori/create-x3bun-app](https://github.com/SamJbori/create-x3bun-app)
- [TypeScript Development First Steps with Bun and Modern Tooling — 2025](https://dappgenie.io/blogs/typescript-development-first-steps-with-bun-and-modern-tooling)
