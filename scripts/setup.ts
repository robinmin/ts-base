#!/usr/bin/env bun
/**
 * One-shot template initializer. Picks application or library mode, wires the
 * matching source folder, scripts, deps, and CI into place, then deletes itself
 * and the unused scaffolding so the result looks hand-written, not templated.
 *
 * Usage:
 *   bun run setup            # interactive prompt
 *   bun run setup --mode=app # or --mode=lib, non-interactive
 */
import { rm } from 'node:fs/promises';
import { $ } from 'bun';

type Mode = 'app' | 'lib';

const ROOT = new URL('..', import.meta.url).pathname;

function fail(message: string): never {
    console.error(`setup: ${message}`);
    process.exit(1);
}

async function resolveMode(): Promise<Mode> {
    const arg = process.argv.find((a) => a.startsWith('--mode='))?.split('=')[1];
    if (arg === 'app' || arg === 'lib') {
        return arg;
    }
    if (arg) {
        fail(`unknown --mode=${arg} (expected "app" or "lib")`);
    }

    process.stdout.write('Initialize as [a]pplication or [l]ibrary? (a/l) ');
    for await (const line of console) {
        const choice = line.trim().toLowerCase();
        if (choice === 'a' || choice === 'app') {
            return 'app';
        }
        if (choice === 'l' || choice === 'lib') {
            return 'lib';
        }
        process.stdout.write('Please type "a" or "l": ');
    }
    fail('no mode selected');
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
    lint: 'biome check . && tsc --noEmit',
    format: 'biome check . --write',
    autofix: 'bun run format && tsc --noEmit',
};

const LIB_SCRIPTS = {
    prepare: 'lefthook install',
    build: 'tsdown',
    dev: 'tsdown --watch',
    test: 'NODE_ENV=test bun test --coverage --coverage-dir=.coverage --reporter=dots',
    'test:full': 'NODE_ENV=test bun test --update-snapshots --coverage --coverage-dir=.coverage',
    lint: 'biome check . && tsc --noEmit',
    format: 'biome check . --write',
    autofix: 'bun run format && tsc --noEmit',
    size: 'size-limit',
};

function patchApp(pkg: PackageJson): void {
    pkg.scripts = APP_SCRIPTS;
    // Application stays private and ships nothing to a registry.
    pkg.private = true;
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
}

async function main(): Promise<void> {
    if (await Bun.file(`${ROOT}/src/index.ts`).exists()) {
        fail('src/ already exists — setup has already run. Aborting to avoid clobbering work.');
    }

    const mode = await resolveMode();
    const keep = mode === 'app' ? 'src-app' : 'src-lib';
    const drop = mode === 'app' ? 'src-lib' : 'src-app';

    if (!(await Bun.file(`${ROOT}/${keep}/index.ts`).exists())) {
        fail(`expected ${keep}/ to exist — is this an unmodified template checkout?`);
    }

    console.info(`Setting up in ${mode} mode...`);

    await $`mv ${ROOT}/${keep} ${ROOT}/src`.quiet();
    await rm(`${ROOT}/${drop}`, { recursive: true, force: true });

    const pkg = await readPackageJson();
    if (mode === 'app') {
        patchApp(pkg);
    } else {
        patchLib(pkg);
    }
    await writePackageJson(pkg);

    if (mode === 'lib') {
        await writeLibExtras();
    } else {
        // Only the library publishes; drop the build config the app never uses.
        await rm(`${ROOT}/tsdown.config.ts`, { force: true });
    }

    await moveWorkflows(mode);

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
