# 🚀 ts-base

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue.svg)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.2-orange.svg)](https://bun.sh/)
[![Biome](https://img.shields.io/badge/Biome-1.9-green.svg)](https://biomejs.dev/)

A modern, production-ready TypeScript starter wired up with Bun, Biome, Git hooks, and conventional commits — clone it and start building.

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

# Install bun, biome, cog, lefthook + project deps + Git hooks
proto use && bun install
```

Or install the tools yourself ([Bun](https://bun.sh/), [Biome](https://biomejs.dev/), [Cocogitto](https://github.com/cocogitto/cocogitto), [Lefthook](https://github.com/evilmartians/lefthook)), then:

```bash
bun install   # installs deps and runs `lefthook install` via the prepare script
```

### Run

```bash
bun run dev     # dev server with file watching
bun run start   # production server
```

## 🛠️ Scripts

| Script           | Description                          |
|------------------|--------------------------------------|
| `bun run start`  | Start the production server          |
| `bun run dev`    | Start the dev server (watch mode)    |
| `bun run test`   | Run tests                            |
| `bun run lint`   | Biome check + `tsc --noEmit`         |
| `bun run format` | Auto-fix and format with Biome       |
| `bun run prepare`| Install Lefthook Git hooks           |

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

## 📁 Project Structure

```
├── src/
│   ├── index.ts          # Application entry point
│   ├── config.ts         # convict-based configuration
│   ├── types.ts          # Shared type utilities (Prettify)
│   └── tests/            # Tests
├── biome.json            # Biome configuration
├── tsconfig.json         # TypeScript configuration
├── .prototools           # Pinned tool versions
└── package.json
```

## 📋 Customization

1. Update `name` and metadata in `package.json`.
2. Replace the server in `src/index.ts` with your own.
3. Adjust `tsconfig.json` / `biome.json` as needed.
4. Rewrite this README for your project.

## 🔒 Security

See [SECURITY.md](SECURITY.md) for the security policy and how to report vulnerabilities.

## 📄 License

Apache 2.0 — see [LICENSE](LICENSE).

## References

- Forked from [tabmadi/ts-template](https://github.com/tabmadi/ts-template) and [bgub/ts-base](https://github.com/bgub/ts-base)
- [TypeScript Development First Steps with Bun and Modern Tooling — 2025](https://dappgenie.io/blogs/typescript-development-first-steps-with-bun-and-modern-tooling)
