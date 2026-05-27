#!/usr/bin/env bun
/**
 * One-shot template initializer. Promotes the chosen layout (app, lib, cli, or mono),
 * wires the matching scripts/deps/CI, then deletes itself and the unused
 * scaffolding so the result looks hand-written, not templated.
 *
 * Usage:
 *   bun run setup                                # interactive prompt
 *   bun run setup --mode=app                     # non-interactive mode select
 *   bun run setup --mode=app --no-db --no-convict  # + strip optional samples
 *
 * Flags (app mode only):
 *   --no-db       Delete src/db.example.ts and skip the Bun SQL dependency.
 *   --no-convict  Remove convict + @types/convict and delete src/config.ts.
 */
import { rm } from 'node:fs/promises';
import { $, Glob } from 'bun';

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

type CleanupFlags = { noDb: boolean; noConvict: boolean };

function parseCleanupFlags(): CleanupFlags {
    return {
        noDb: process.argv.includes('--no-db'),
        noConvict: process.argv.includes('--no-convict'),
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

async function readPackageJson(): Promise<PackageJson> {
    return (await Bun.file(`${ROOT}/package.json`).json()) as PackageJson;
}

async function writePackageJson(pkg: PackageJson): Promise<void> {
    await Bun.write(`${ROOT}/package.json`, `${JSON.stringify(pkg, null, 4)}\n`);
}

const APP_SCRIPTS = {
    prepare: 'lefthook install',
    start: 'bun run src/index.ts',
    dev: 'bun --watch run src/index.ts',
    test: 'NODE_ENV=test bun test --coverage --coverage-dir=.coverage --reporter=dots',
    'test:full': 'NODE_ENV=test bun test --update-snapshots --coverage --coverage-dir=.coverage',
    typecheck: 'tsc --noEmit',
    lint: 'biome check . && bun run typecheck',
    format: 'biome check . --write',
    autofix: 'bun run format && bun run typecheck',
};

const LIB_SCRIPTS = {
    prepare: 'lefthook install',
    build: 'tsdown',
    dev: 'tsdown --watch',
    test: 'NODE_ENV=test bun test --coverage --coverage-dir=.coverage --reporter=dots',
    'test:full': 'NODE_ENV=test bun test --update-snapshots --coverage --coverage-dir=.coverage',
    typecheck: 'tsc --noEmit',
    lint: 'biome check . && bun run typecheck',
    format: 'biome check . --write',
    autofix: 'bun run format && bun run typecheck',
    size: 'size-limit',
};

function patchApp(pkg: PackageJson, flags: CleanupFlags): void {
    pkg.scripts = APP_SCRIPTS;
    pkg.private = true;

    if (flags.noConvict) {
        if (pkg.dependencies) {
            delete pkg.dependencies.convict;
            if (Object.keys(pkg.dependencies).length === 0) {
                delete pkg.dependencies;
            }
        }
        if (pkg.devDependencies?.['@types/convict']) {
            delete pkg.devDependencies['@types/convict'];
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
            import: './dist/index.js',
            types: './dist/index.d.ts',
        },
        './browser': {
            import: './dist/browser.js',
            types: './dist/browser.d.ts',
        },
    };
    pkg.types = './dist/index.d.ts';
    pkg.browser = './dist/browser.js';
    pkg.sideEffects = false;
    pkg.files = ['dist'];
    pkg['size-limit'] = [{ path: 'dist/browser.js', limit: '3.5 KB' }];

    // convict is an application concern; libraries should not carry it.
    if (pkg.dependencies) {
        delete pkg.dependencies.convict;
        if (Object.keys(pkg.dependencies).length === 0) {
            delete pkg.dependencies;
        }
    }
    pkg.devDependencies = {
        ...pkg.devDependencies,
        '@size-limit/preset-small-lib': '^11',
        'size-limit': '^11',
        tsdown: '^0.15.0',
    };
    if (pkg.devDependencies['@types/convict']) {
        delete pkg.devDependencies['@types/convict'];
    }
}

async function writeJson(path: string, value: unknown): Promise<void> {
    // 4-space indent matches biome.json's formatter so `bun run lint` stays clean.
    await Bun.write(`${ROOT}/${path}`, `${JSON.stringify(value, null, 4)}\n`);
}

async function writeLibExtras(): Promise<void> {
    const pkg = await readPackageJson();
    await writeJson('release-please-config.json', { 'release-type': 'node', packages: { '.': {} } });
    await writeJson('.release-please-manifest.json', { '.': pkg.version ?? '0.0.0' });
    await writeJson('jsr.json', {
        name: pkg.name,
        version: pkg.version ?? '0.0.0',
        exports: { '.': './src/index.ts', './browser': './src/browser.ts' },
    });
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
}

// Replaces the @SCOPE placeholder in every package.json with the project's real
// scope. Source files use relative imports and need no rewriting.
async function applyScope(scope: string): Promise<void> {
    const patterns = ['package.json', 'apps/*/package.json', 'packages/*/package.json'];
    const seen = new Set<string>();
    for (const pattern of patterns) {
        for await (const rel of new Glob(pattern).scan({ cwd: ROOT })) {
            if (seen.has(rel)) {
                continue;
            }
            seen.add(rel);
            const path = `${ROOT}/${rel}`;
            const text = await Bun.file(path).text();
            await Bun.write(path, text.replaceAll('@SCOPE/', `@${scope}/`));
        }
    }
}

async function setupWorkspace(mode: 'cli' | 'mono', scope: string): Promise<void> {
    const srcDir = mode === 'cli' ? 'src-cli' : 'src-monorepo';
    const srcRoot = `${ROOT}/${srcDir}`;

    // Promote the workspace contents up to the repo root.
    for (const entry of ['apps', 'packages', 'tooling', 'turbo.json']) {
        await $`mv ${srcRoot}/${entry} ${ROOT}/${entry}`.quiet();
    }
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
        if (flags.noConvict) {
            await rm(`${ROOT}/src/config.ts`, { force: true });
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
    } else {
        await rm(`${ROOT}/tsdown.config.ts`, { force: true });
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

    // Remove the setup script and its package.json entry — the job is done.
    const finalPkg = await readPackageJson();
    if (finalPkg.scripts?.setup) {
        delete finalPkg.scripts.setup;
        await writePackageJson(finalPkg);
    }
    await rm(`${ROOT}/scripts/setup.ts`, { force: true });
    await $`rmdir ${ROOT}/scripts`.quiet().nothrow();

    console.info(`\nDone. ${mode} mode is wired up.`);
    console.info('Next: bun install && bun run test');
}

await main();
