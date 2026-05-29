#!/usr/bin/env bun
/**
 * One-shot template initializer. Promotes the chosen layout (app, lib, cli, or mono),
 * wires the matching scripts/deps/CI, then deletes itself and the unused
 * scaffolding so the result looks hand-written, not templated.
 *
 * Usage:
 *   bun run setup                              # interactive prompt
 *   bun run setup --mode=app                   # non-interactive mode select
 *   bun run setup --mode=app --no-db --no-config  # + strip optional samples
 *
 * Flags (app mode only):
 *   --no-db      Delete src/db.example.ts.
 *   --no-config  Delete src/config.ts, drop zod dep, and rewrite src/index.ts
 *               to read PORT directly from the environment.
 */
import { rm } from 'node:fs/promises';
import { $, Glob } from 'bun';
import { APP_SCRIPTS, LIB_SCRIPTS } from './_modes';

type Mode = 'app' | 'lib' | 'cli' | 'mono';

const ROOT = new URL('..', import.meta.url).pathname;

function fail(message: string): never {
    console.error(`setup: ${message}`);
    process.exit(1);
}

async function resolveMode(): Promise<Mode> {
    const arg = process.argv.find((a) => a.startsWith('--mode='))?.split('=')[1];
    if (arg === 'app' || arg === 'lib' || arg === 'cli' || arg === 'mono') {
        return arg;
    }
    if (arg) {
        fail(`unknown --mode=${arg} (expected "app", "lib", "cli", or "mono")`);
    }

    process.stdout.write('Initialize as [a]pplication, [l]ibrary, [c]li, or [m]onorepo? (a/l/c/m) ');
    for await (const line of console) {
        const choice = line.trim().toLowerCase();
        if (choice === 'a' || choice === 'app') {
            return 'app';
        }
        if (choice === 'l' || choice === 'lib') {
            return 'lib';
        }
        if (choice === 'c' || choice === 'cli') {
            return 'cli';
        }
        if (choice === 'm' || choice === 'mono') {
            return 'mono';
        }
        process.stdout.write('Please type "a", "l", "c", or "m": ');
    }
    fail('no mode selected');
}

type CleanupFlags = { noDb: boolean; noConfig: boolean };

function parseCleanupFlags(): CleanupFlags {
    return {
        noDb: process.argv.includes('--no-db'),
        noConfig: process.argv.includes('--no-config'),
    };
}

// Turns a package name into a workspace scope: "@foo/bar" or "foo" -> "foo".
function deriveScope(name: unknown): string {
    const raw = typeof name === 'string' && name.length > 0 ? name : 'app';
    const stripped = raw.startsWith('@') ? raw.slice(1).split('/')[0] : raw;
    // npm scopes allow lowercase letters, digits, hyphens, dots, underscores.
    return (stripped ?? 'app').toLowerCase().replace(/[^a-z0-9._-]/g, '-') || 'app';
}

// biome-ignore lint/suspicious/noExplicitAny: package.json is free-form JSON.
type PackageJson = Record<string, any>;

const JS_EXT = '.js';

async function readPackageJson(): Promise<PackageJson> {
    return (await Bun.file(`${ROOT}/package.json`).json()) as PackageJson;
}

async function writePackageJson(pkg: PackageJson): Promise<void> {
    await Bun.write(`${ROOT}/package.json`, `${JSON.stringify(pkg, null, 4)}\n`);
}

// Drop-in replacement for src/index.ts when --no-config strips src/config.ts.
// Keeps the same single-route Bun.serve shape with PORT read from the env.
const MINIMAL_APP_ENTRY = `const server = Bun.serve({
    port: Number(process.env.PORT ?? 3000),
    fetch(request) {
        const url = new URL(request.url);

        if (url.pathname === '/health') {
            return new Response(
                JSON.stringify({
                    status: 'ok',
                    timestamp: new Date().toISOString(),
                    uptime: process.uptime(),
                }),
                {
                    headers: { 'Content-Type': 'application/json' },
                },
            );
        }

        return new Response(null, { status: 404 });
    },
});

console.info(\`Server running at http://localhost:\${server.port}\`);
`;

function patchApp(pkg: PackageJson, flags: CleanupFlags): void {
    pkg.scripts = APP_SCRIPTS;
    pkg.private = true;

    if (flags.noConfig && pkg.dependencies?.zod) {
        delete pkg.dependencies.zod;
        if (Object.keys(pkg.dependencies).length === 0) {
            delete pkg.dependencies;
        }
    }
}

function patchLib(pkg: PackageJson): void {
    pkg.scripts = LIB_SCRIPTS;

    pkg.private = false;
    pkg.version ??= '0.0.0';
    pkg.type = 'module';
    pkg.exports = {
        '.': {
            import: `./dist/index${JS_EXT}`,
            types: './dist/index.d.ts',
        },
        './browser': {
            import: `./dist/browser${JS_EXT}`,
            types: './dist/browser.d.ts',
        },
    };
    pkg.types = './dist/index.d.ts';
    pkg.browser = `./dist/browser${JS_EXT}`;
    pkg.sideEffects = false;
    pkg.files = ['dist'];
    delete pkg['size-limit'];

    // zod is an application concern; libraries should not bundle it.
    if (pkg.dependencies?.zod) {
        delete pkg.dependencies.zod;
        if (Object.keys(pkg.dependencies).length === 0) {
            delete pkg.dependencies;
        }
    }
    // Published library: declare the TS version range consumers must compile against.
    pkg.peerDependencies = {
        ...pkg.peerDependencies,
        typescript: '>=5.4 <7',
    };
}

// Promotes the lib's release-config scaffolds (checked in under src-lib/, now
// at src/ after the mv) up to the repo root, substituting placeholders. Keeping
// these as on-disk files instead of inlined JSON makes them reviewable as PRs.
async function writeLibExtras(): Promise<void> {
    const pkg = await readPackageJson();
    const version = (pkg.version as string | undefined) ?? '0.0.0';
    const scope = deriveScope(pkg.name);
    const moves: Array<[string, (text: string) => string]> = [
        ['release-please-config.json', (t) => t],
        ['.release-please-manifest.json', (t) => t.replaceAll('0.0.0', version)],
        ['jsr.json', (t) => t.replaceAll('@SCOPE/', `@${scope}/`).replaceAll('0.0.0', version)],
    ];
    for (const [name, transform] of moves) {
        const srcPath = `${ROOT}/src/${name}`;
        const destPath = `${ROOT}/${name}`;
        const text = await Bun.file(srcPath).text();
        await Bun.write(destPath, transform(text));
        await rm(srcPath, { force: true });
    }
}

async function moveWorkflows(mode: Mode): Promise<void> {
    const src = `${ROOT}/.github/workflows-${mode}`;
    const dest = `${ROOT}/.github/workflows`;
    await $`mkdir -p ${dest}`.quiet();
    await $`cp -R ${src}/. ${dest}/`.quiet();
    await rm(`${ROOT}/.github/workflows-app`, { recursive: true, force: true });
    await rm(`${ROOT}/.github/workflows-lib`, { recursive: true, force: true });
    await rm(`${ROOT}/.github/workflows-cli`, { recursive: true, force: true });
    await rm(`${ROOT}/.github/workflows-mono`, { recursive: true, force: true });
}

async function promoteTsconfig(mode: 'app' | 'lib'): Promise<void> {
    const src = `${ROOT}/tsconfig.${mode}.json`;
    const text = await Bun.file(src).text();
    await Bun.write(`${ROOT}/tsconfig.json`, text);
    await rm(`${ROOT}/tsconfig.app.json`, { force: true });
    await rm(`${ROOT}/tsconfig.lib.json`, { force: true });
    await rm(`${ROOT}/tsconfig.template.json`, { force: true });
}

// Replaces the @SCOPE placeholder in every text file under apps/, packages/,
// tooling/, and root-level docs/configs after promotion. A single broad sweep
// avoids the prior whack-a-mole of per-folder globs missing vite.config.ts,
// index.html, tooling/, deeply-nested sources, etc.
async function applyScope(scope: string): Promise<void> {
    const patterns = ['apps/**/*', 'packages/**/*', 'tooling/**/*', '*.{json,md,ts,tsx,html}'];
    const seen = new Set<string>();
    for (const pattern of patterns) {
        // Glob's default scan returns files only, not directories.
        for await (const rel of new Glob(pattern).scan({ cwd: ROOT })) {
            if (seen.has(rel) || rel.includes('node_modules/') || rel.includes('.turbo/')) {
                continue;
            }
            seen.add(rel);
            const path = `${ROOT}/${rel}`;
            const text = await Bun.file(path).text();
            if (text.includes('@SCOPE/')) {
                await Bun.write(path, normalizePromotedScopeImports(text.replaceAll('@SCOPE/', `@${scope}/`), scope));
            }
        }
    }
}

function normalizePromotedScopeImports(text: string, scope: string): string {
    const apiType = `import type { planetContract } from '@${scope}/api';`;
    const apiPlanetType = `import type { Planet } from '@${scope}/api';`;
    const apiPlanet = `import { planetContract } from '@${scope}/api';`;
    const utilsZod = `import { z } from '@${scope}/utils';`;

    return text
        .replace(
            `${apiType}\nimport { createORPCClient } from '@orpc/client';\nimport { RPCLink } from '@orpc/client/fetch';\nimport type { ContractRouterClient } from '@orpc/contract';`,
            `import { createORPCClient } from '@orpc/client';\nimport { RPCLink } from '@orpc/client/fetch';\nimport type { ContractRouterClient } from '@orpc/contract';\n${apiType}`,
        )
        .replace(
            `${apiPlanetType}\n${apiPlanet}\nimport { implement, ORPCError } from '@orpc/server';`,
            `import { implement, ORPCError } from '@orpc/server';\n${apiPlanetType}\n${apiPlanet}`,
        )
        .replace(
            `${utilsZod}\nimport { oc } from '@orpc/contract';`,
            `import { oc } from '@orpc/contract';\n${utilsZod}`,
        );
}

async function setupWorkspace(mode: 'cli' | 'mono', scope: string): Promise<void> {
    const srcDir = mode === 'cli' ? 'src-cli' : 'src-monorepo';
    const srcRoot = `${ROOT}/${srcDir}`;

    // Promote the workspace contents up to the repo root. `tooling/` is
    // copied with -L so symlinked tsconfig presets (used to dedupe across
    // src-cli and src-monorepo at template-authoring time) materialize into
    // real files in the promoted project.
    for (const entry of ['apps', 'packages', 'turbo.json']) {
        await $`mv ${srcRoot}/${entry} ${ROOT}/${entry}`.quiet();
    }
    await $`cp -RL ${srcRoot}/tooling ${ROOT}/tooling`.quiet();
    // The workspace root package.json becomes the project's, carrying the
    // project name forward.
    const flatPkg = await readPackageJson();
    const wsPkg = (await Bun.file(`${srcRoot}/package.json`).json()) as PackageJson;
    wsPkg.name = flatPkg.name ?? 'app';
    await writePackageJson(wsPkg);

    // Drop all other mode scaffolding the workspace doesn't use.
    await rm(`${srcRoot}`, { recursive: true, force: true });
    for (const dir of ['src-app', 'src-lib', 'src-cli', 'src-monorepo']) {
        await rm(`${ROOT}/${dir}`, { recursive: true, force: true });
    }
    await rm(`${ROOT}/tsconfig.json`, { force: true });
    await rm(`${ROOT}/tsconfig.app.json`, { force: true });
    await rm(`${ROOT}/tsconfig.lib.json`, { force: true });
    await rm(`${ROOT}/tsconfig.template.json`, { force: true });
    await rm(`${ROOT}/tsdown.config.ts`, { force: true });

    await applyScope(scope);
    await moveWorkflows(mode);
}

async function setupFlat(mode: 'app' | 'lib', flags: CleanupFlags): Promise<void> {
    const keep = mode === 'app' ? 'src-app' : 'src-lib';
    const drop = mode === 'app' ? 'src-lib' : 'src-app';

    if (!(await Bun.file(`${ROOT}/${keep}/index.ts`).exists())) {
        fail(`expected ${keep}/ to exist — is this an unmodified template checkout?`);
    }

    await $`mv ${ROOT}/${keep} ${ROOT}/src`.quiet();
    await rm(`${ROOT}/${drop}`, { recursive: true, force: true });
    await rm(`${ROOT}/src-cli`, { recursive: true, force: true });
    await rm(`${ROOT}/src-monorepo`, { recursive: true, force: true });

    if (mode === 'app') {
        if (flags.noDb) {
            await rm(`${ROOT}/src/db.example.ts`, { force: true });
        }
        if (flags.noConfig) {
            await rm(`${ROOT}/src/config.ts`, { force: true });
            // src/index.ts imports ./config. Replace it with an env-only
            // fallback so the resulting app boots without that module.
            await Bun.write(`${ROOT}/src/index.ts`, MINIMAL_APP_ENTRY);
        }
    }

    const pkg = await readPackageJson();
    if (mode === 'app') {
        patchApp(pkg, flags);
    } else {
        patchLib(pkg);
    }
    await writePackageJson(pkg);

    if (mode === 'lib') {
        await writeLibExtras();
        await rm(`${ROOT}/tsdown.config.ts`, { force: true });
    } else {
        await rm(`${ROOT}/tsdown.config.ts`, { force: true });
        await rm(`${ROOT}/tsconfig.build.json`, { force: true });
        await rm(`${ROOT}/scripts/fix-dist-esm-extensions.ts`, { force: true });
        await rm(`${ROOT}/scripts/smoke-dist-imports.ts`, { force: true });
    }

    await promoteTsconfig(mode);
    await moveWorkflows(mode);
}

async function main(): Promise<void> {
    if (await Bun.file(`${ROOT}/src/index.ts`).exists()) {
        fail('src/ already exists — setup has already run. Aborting to avoid clobbering work.');
    }

    const mode = await resolveMode();
    const flags = parseCleanupFlags();
    console.info(`Setting up in ${mode} mode...`);

    if (mode === 'cli' || mode === 'mono') {
        const scope = deriveScope((await readPackageJson()).name);
        await setupWorkspace(mode, scope);
    } else {
        await setupFlat(mode, flags);
    }

    // Drop the unused mode-specific AGENTS scaffolds, then swap the chosen one
    // into place. Doing this before promotion would skip the source-of-truth
    // copy, so it runs last.
    for (const m of ['app', 'lib', 'cli', 'mono']) {
        if (m === mode) continue;
        await rm(`${ROOT}/AGENTS-${m}.md`, { force: true });
    }
    const agentsSrc = `${ROOT}/AGENTS-${mode}.md`;
    if (await Bun.file(agentsSrc).exists()) {
        await $`mv ${agentsSrc} ${ROOT}/AGENTS.md`.quiet();
    }

    // Same swap for the architecture decision record: keep the chosen mode's
    // ADR as the binding docs/00_ADR.md, drop the rest. The kept ADR is the
    // architectural contract the AGENTS.md guidance points back to.
    for (const m of ['app', 'lib', 'cli', 'mono']) {
        if (m === mode) continue;
        await rm(`${ROOT}/docs/00_ADR-${m}.md`, { force: true });
    }
    const adrSrc = `${ROOT}/docs/00_ADR-${mode}.md`;
    if (await Bun.file(adrSrc).exists()) {
        await $`mv ${adrSrc} ${ROOT}/docs/00_ADR.md`.quiet();
    }

    // Wire the .agents/skills symlink so multi-agent tooling (claude, codex, pi, …)
    // shares a single skill tree without copying. Only create it when the
    // target actually exists, otherwise the result is a dangling symlink that
    // confuses tools and `git status`.
    if (await Bun.file(`${ROOT}/.claude/skills`).exists()) {
        await $`mkdir -p ${ROOT}/.agents`.quiet();
        await $`ln -sf ../.claude/skills ${ROOT}/.agents/skills`.quiet();
    }

    // Drop the template lockfile. It carried deps for every mode, which
    // patchApp/patchLib have just edited away.
    // The user runs `bun install` next and gets a fresh, mode-specific lock.
    await rm(`${ROOT}/bun.lock`, { force: true });

    // Remove the template-only scripts first, then strip their package.json
    // entries. If the process dies between, leftover `bun run …` calls produce
    // a clear "module not found" instead of silently re-running stale code.
    const removableScripts = ['setup.ts', '_modes.ts', 'clean.ts', 'test-setup.ts', 'ensure-scaffold-installs.ts'];
    if (mode !== 'lib') {
        removableScripts.push('fix-dist-esm-extensions.ts', 'smoke-dist-imports.ts');
    }
    for (const f of removableScripts) {
        await rm(`${ROOT}/scripts/${f}`, { force: true });
    }
    await $`rmdir ${ROOT}/scripts`.quiet().nothrow();
    const finalPkg = await readPackageJson();
    let changed = false;
    for (const entry of ['setup', 'clean', 'test:setup', 'pretest']) {
        if (finalPkg.scripts?.[entry]) {
            delete finalPkg.scripts[entry];
            changed = true;
        }
    }
    if (changed) {
        await writePackageJson(finalPkg);
    }

    console.info(`\nDone. ${mode} mode is wired up.`);
    console.info('Next: bun install && bun run test');
}

await main();
