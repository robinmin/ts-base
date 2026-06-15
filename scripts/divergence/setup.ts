import { readdir, rm, symlink } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { $ } from 'bun';
import { APP_SCRIPTS, LIB_SCRIPTS } from '../_modes';
import { pruneModeScopedCapabilities, wireAgentSkillsSymlink } from '../agent-convergence/capabilities';
import type { Mode } from '../agent-convergence/types';
import { logger } from '../lib/logger';

interface PackageJson {
    name?: string;
    version?: string;
    private?: boolean;
    type?: string;
    scripts?: Record<string, string>;
    dependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
    exports?: Record<string, unknown>;
    types?: string;
    browser?: string;
    sideEffects?: boolean;
    files?: string[];
    [key: string]: unknown;
}

type CleanupFlags = { noDb: boolean; noConfig: boolean };

const JS_EXT = '.js';

function fail(message: string): never {
    logger.error(message);
    process.exit(1);
}

/** Parse --mode=<mode> from CLI args. Returns undefined when absent; calls fail() on invalid value. */
export function parseModeArg(args: string[]): Mode | undefined {
    const arg = args.find((a) => a.startsWith('--mode='))?.split('=')[1];
    if (arg === 'app' || arg === 'lib' || arg === 'cli' || arg === 'mono') {
        return arg;
    }
    if (arg) {
        fail(`unknown --mode=${arg} (expected "app", "lib", "cli", or "mono")`);
    }
    return undefined;
}

async function promptMode(): Promise<Mode> {
    logger.prompt('Initialize as [a]pplication, [l]ibrary, [c]li, or [m]onorepo? (a/l/c/m) ');
    for await (const line of console) {
        const choice = line.trim().toLowerCase();
        if (choice === 'a' || choice === 'app') return 'app';
        if (choice === 'l' || choice === 'lib') return 'lib';
        if (choice === 'c' || choice === 'cli') return 'cli';
        if (choice === 'm' || choice === 'mono') return 'mono';
        logger.prompt('Please type "a", "l", "c", or "m": ');
    }
    fail('no mode selected');
}

/** Parse --no-db and --no-config flags from CLI args. */
export function parseCleanupFlags(args: string[]): CleanupFlags {
    return {
        noDb: args.includes('--no-db'),
        noConfig: args.includes('--no-config'),
    };
}

/** Derive an npm scope from a package name. Falls back to "app". */
export function deriveScope(name: unknown): string {
    const raw = typeof name === 'string' && name.length > 0 ? name : 'app';
    const stripped = raw.startsWith('@') ? raw.slice(1).split('/')[0] : raw;
    return (stripped ?? 'app').toLowerCase().replace(/[^a-z0-9._-]/g, '-') || 'app';
}

/** Read and parse package.json as free-form JSON. */
export async function readPackageJson(root: string): Promise<PackageJson> {
    return (await Bun.file(`${root}/package.json`).json()) as PackageJson;
}

/** Write package.json with 4-space indent and trailing newline. */
export async function writePackageJson(root: string, pkg: PackageJson): Promise<void> {
    await Bun.write(`${root}/package.json`, `${JSON.stringify(pkg, null, 4)}\n`);
}

// Drop-in replacement for src/index.ts when --no-config strips src/config.ts.
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

con${''}sole.info(\`Server running at http://localhost:\${server.port}\`);
`;

/** Mutate a package.json object for application mode: set scripts, optionally strip db/config deps. */
export function patchApp(pkg: PackageJson, flags: CleanupFlags): void {
    pkg.scripts = APP_SCRIPTS;

    if (flags.noDb && pkg.dependencies?.['@libsql/client']) {
        delete pkg.dependencies['@libsql/client'];
        if (Object.keys(pkg.dependencies).length === 0) {
            delete pkg.dependencies;
        }
    }
    if (flags.noConfig && pkg.dependencies?.zod) {
        delete pkg.dependencies.zod;
        if (Object.keys(pkg.dependencies).length === 0) {
            delete pkg.dependencies;
        }
    }
}

/** Mutate a package.json object for library mode: set exports, strip zod, add TS peer dep. */
export function patchLib(pkg: PackageJson): void {
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

    if (pkg.dependencies?.zod) {
        delete pkg.dependencies.zod;
        if (Object.keys(pkg.dependencies).length === 0) {
            delete pkg.dependencies;
        }
    }
    pkg.peerDependencies = {
        ...pkg.peerDependencies,
        typescript: '>=5.4 <7',
    };
}

/** Promote lib release-config scaffolds from src/ to repo root with scope/version substitution. */
export async function writeLibExtras(root: string): Promise<void> {
    const pkg = await readPackageJson(root);
    const version = (pkg.version as string | undefined) ?? '0.0.0';
    const scope = deriveScope(pkg.name);
    const moves: Array<[string, (text: string) => string]> = [
        ['release-please-config.json', (t) => t],
        ['.release-please-manifest.json', (t) => t.replaceAll('0.0.0', version)],
        ['jsr.json', (t) => t.replaceAll('@SCOPE/', `@${scope}/`).replaceAll('0.0.0', version)],
    ];
    for (const [name, transform] of moves) {
        const srcPath = `${root}/src/${name}`;
        const destPath = `${root}/${name}`;
        const text = await Bun.file(srcPath).text();
        await Bun.write(destPath, transform(text));
        await rm(srcPath, { force: true });
    }
}

async function moveWorkflows(root: string, mode: Mode): Promise<void> {
    const src = `${root}/.github/workflows-${mode}`;
    await $`mkdir -p ${root}/.github/workflows`.quiet();
    for await (const entry of new Bun.Glob('*').scan({ cwd: src })) {
        await $`mv ${src}/${entry} ${root}/.github/workflows/${entry}`.quiet();
    }
    await rm(`${root}/.github/workflows-app`, { recursive: true, force: true });
    await rm(`${root}/.github/workflows-lib`, { recursive: true, force: true });
    await rm(`${root}/.github/workflows-cli`, { recursive: true, force: true });
    await rm(`${root}/.github/workflows-mono`, { recursive: true, force: true });
}

/** Promote tsconfig.{mode}.json → tsconfig.json and remove unused tsconfig variants. */
export async function promoteTsconfig(root: string, mode: 'app' | 'lib'): Promise<void> {
    const src = `${root}/tsconfig.${mode}.json`;
    const text = await Bun.file(src).text();
    await Bun.write(`${root}/tsconfig.json`, text);
    await rm(`${root}/tsconfig.app.json`, { force: true });
    await rm(`${root}/tsconfig.lib.json`, { force: true });
    await rm(`${root}/tsconfig.template.json`, { force: true });
}

async function applyScope(root: string, scope: string): Promise<void> {
    const patterns = ['apps/**/*', 'packages/**/*', 'tooling/**/*', '*.{json,md,ts,tsx,html}'];
    const seen = new Set<string>();
    for (const pattern of patterns) {
        for await (const rel of new Bun.Glob(pattern).scan({ cwd: root })) {
            if (seen.has(rel) || rel.includes('node_modules/') || rel.includes('.turbo/')) {
                continue;
            }
            seen.add(rel);
            const path = `${root}/${rel}`;
            const text = await Bun.file(path).text();
            if (text.includes('@SCOPE/')) {
                await Bun.write(path, normalizePromotedScopeImports(text.replaceAll('@SCOPE/', `@${scope}/`), scope));
            }
        }
    }
}

/** Reorder import statements in promoted source files so @orpc/* imports appear before @scope/*. */
export function normalizePromotedScopeImports(text: string, scope: string): string {
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

/**
 * Replace symlinks in src-cli/tooling with the real file content from
 * src-monorepo/tooling. degit rewrites relative symlinks to absolute
 * degit-cache paths that dangle after extraction, breaking `cp -RL`.
 */
async function resolveToolingSymlinks(srcTooling: string, realTooling: string): Promise<void> {
    async function walk(dir: string): Promise<void> {
        for (const entry of await readdir(dir, { withFileTypes: true })) {
            const full = join(dir, entry.name);
            if (entry.isSymbolicLink()) {
                const rel = relative(srcTooling, full);
                const real = join(realTooling, rel);
                if (await Bun.file(real).exists()) {
                    const content = await Bun.file(real).text();
                    await rm(full, { force: true });
                    await Bun.write(full, content);
                }
            } else if (entry.isDirectory()) {
                await walk(full);
            }
        }
    }
    await walk(srcTooling);
}

async function setupWorkspace(root: string, mode: 'cli' | 'mono', scope: string): Promise<void> {
    const srcDir = mode === 'cli' ? 'src-cli' : 'src-monorepo';
    const srcRoot = `${root}/${srcDir}`;

    for (const entry of ['apps', 'packages']) {
        await $`mv ${srcRoot}/${entry} ${root}/${entry}`.quiet();
    }
    if (mode === 'cli') {
        await resolveToolingSymlinks(`${srcRoot}/tooling`, `${root}/src-monorepo/tooling`);
    }
    await $`cp -R ${srcRoot}/tooling ${root}/tooling`.quiet();
    const flatPkg = await readPackageJson(root);
    const wsPkg = (await Bun.file(`${srcRoot}/package.json`).json()) as PackageJson;
    wsPkg.name = flatPkg.name ?? 'app';
    await writePackageJson(root, wsPkg);

    await rm(`${srcRoot}`, { recursive: true, force: true });
    for (const dir of ['src-app', 'src-lib', 'src-cli', 'src-monorepo']) {
        await rm(`${root}/${dir}`, { recursive: true, force: true });
    }
    await rm(`${root}/tsconfig.json`, { force: true });
    await rm(`${root}/tsconfig.app.json`, { force: true });
    await rm(`${root}/tsconfig.lib.json`, { force: true });
    await rm(`${root}/tsconfig.template.json`, { force: true });
    await rm(`${root}/tsdown.config.ts`, { force: true });

    await applyScope(root, scope);
    await moveWorkflows(root, mode);
}

async function setupFlat(root: string, mode: 'app' | 'lib', flags: CleanupFlags): Promise<void> {
    const keep = mode === 'app' ? 'src-app' : 'src-lib';
    const drop = mode === 'app' ? 'src-lib' : 'src-app';

    if (!(await Bun.file(`${root}/${keep}/index.ts`).exists())) {
        fail(`expected ${keep}/ to exist — is this an unmodified template checkout?`);
    }

    await $`mv ${root}/${keep} ${root}/src`.quiet();
    await rm(`${root}/${drop}`, { recursive: true, force: true });
    await rm(`${root}/src-cli`, { recursive: true, force: true });
    await rm(`${root}/src-monorepo`, { recursive: true, force: true });

    if (mode === 'app') {
        if (flags.noDb) {
            await rm(`${root}/src/db.example.ts`, { force: true });
        }
        if (flags.noConfig) {
            await rm(`${root}/src/config.ts`, { force: true });
            await Bun.write(`${root}/src/index.ts`, MINIMAL_APP_ENTRY);
        }
    }

    const pkg = await readPackageJson(root);
    if (mode === 'app') {
        patchApp(pkg, flags);
    } else {
        patchLib(pkg);
    }
    await writePackageJson(root, pkg);

    if (mode === 'lib') {
        await writeLibExtras(root);
        await rm(`${root}/tsdown.config.ts`, { force: true });
    } else {
        await rm(`${root}/tsdown.config.ts`, { force: true });
        await rm(`${root}/tsconfig.build.json`, { force: true });
        await rm(`${root}/scripts/fix-dist-esm-extensions.ts`, { force: true });
        await rm(`${root}/scripts/smoke-dist-imports.ts`, { force: true });
    }

    await promoteTsconfig(root, mode);
    await moveWorkflows(root, mode);
}

/**
 * Recreate CLAUDE.md and GEMINI.md symlinks pointing to AGENTS.md.
 * degit rewrites them to absolute degit-cache paths that dangle; after
 * the chosen AGENTS-<mode>.md is moved to AGENTS.md, these must be
 * repaired to point at the real file.
 */
async function repairAgentSymlinks(root: string): Promise<void> {
    for (const name of ['CLAUDE.md', 'GEMINI.md']) {
        const path = `${root}/${name}`;
        await rm(path, { force: true });
        await symlink('AGENTS.md', path);
    }
}

/** Run the one-shot template initializer. */
export async function runSetup(args: string[], projectRoot: string): Promise<number> {
    if (await Bun.file(`${projectRoot}/src/index.ts`).exists()) {
        fail('src/ already exists — setup has already run. Aborting to avoid clobbering work.');
    }

    const mode = parseModeArg(args) ?? (await promptMode());
    const flags = parseCleanupFlags(args);
    logger.info(`Setting up in ${mode} mode...`);

    if (mode === 'cli' || mode === 'mono') {
        const scope = deriveScope((await readPackageJson(projectRoot)).name);
        await setupWorkspace(projectRoot, mode, scope);
    } else {
        await setupFlat(projectRoot, mode, flags);
    }

    // Drop unused AGENTS scaffolds, swap chosen one into place.
    for (const m of ['app', 'lib', 'cli', 'mono']) {
        if (m === mode) continue;
        await rm(`${projectRoot}/AGENTS-${m}.md`, { force: true });
    }
    const agentsSrc = `${projectRoot}/AGENTS-${mode}.md`;
    if (await Bun.file(agentsSrc).exists()) {
        await $`mv ${agentsSrc} ${projectRoot}/AGENTS.md`.quiet();
    }
    await repairAgentSymlinks(projectRoot);

    // Swap ADR: keep chosen mode's, drop rest.
    for (const m of ['app', 'lib', 'cli', 'mono']) {
        if (m === mode) continue;
        await rm(`${projectRoot}/docs/00_ADR-${m}.md`, { force: true });
    }
    const adrSrc = `${projectRoot}/docs/00_ADR-${mode}.md`;
    if (await Bun.file(adrSrc).exists()) {
        await $`mv ${adrSrc} ${projectRoot}/docs/00_ADR.md`.quiet();
    }

    // Prune mode-scoped capabilities and wire agent skills symlink.
    await pruneModeScopedCapabilities(projectRoot, mode);
    await wireAgentSkillsSymlink(projectRoot);

    // Drop template lockfile for fresh install.
    await rm(`${projectRoot}/bun.lock`, { force: true });

    // Remove template-only scripts and strip their package.json entries.
    const removableScripts = [
        'setup.ts',
        '_modes.ts',
        'clean.ts',
        'test-setup.ts',
        'ensure-scaffold-installs.ts',
        'ts-base.ts',
    ];
    if (mode !== 'lib') {
        removableScripts.push('fix-dist-esm-extensions.ts', 'smoke-dist-imports.ts');
    }
    for (const f of removableScripts) {
        await rm(`${projectRoot}/scripts/${f}`, { force: true });
    }
    await $`rmdir ${projectRoot}/scripts`.quiet().nothrow();
    const finalPkg = await readPackageJson(projectRoot);
    let changed = false;
    for (const entry of ['setup', 'clean', 'test:setup', 'pretest']) {
        if (finalPkg.scripts?.[entry]) {
            delete finalPkg.scripts[entry];
            changed = true;
        }
    }
    if (changed) {
        await writePackageJson(projectRoot, finalPkg);
    }

    logger.info(`\nDone. ${mode} mode is wired up.`);
    logger.info('Next: proto use && git init && bun install && bun run test');
    return 0;
}

/**
 * Non-interactive setup for test-setup to call directly.
 * All flags are explicit — no stdin prompt, no process.argv.
 */
export async function runSetupDirect(mode: Mode, flags: CleanupFlags, projectRoot: string): Promise<number> {
    if (await Bun.file(`${projectRoot}/src/index.ts`).exists()) {
        fail('src/ already exists — setup has already run.');
    }

    logger.info(`Setting up in ${mode} mode...`);

    if (mode === 'cli' || mode === 'mono') {
        const scope = deriveScope((await readPackageJson(projectRoot)).name);
        await setupWorkspace(projectRoot, mode, scope);
    } else {
        await setupFlat(projectRoot, mode, flags);
    }

    for (const m of ['app', 'lib', 'cli', 'mono']) {
        if (m === mode) continue;
        await rm(`${projectRoot}/AGENTS-${m}.md`, { force: true });
    }
    const agentsSrc = `${projectRoot}/AGENTS-${mode}.md`;
    if (await Bun.file(agentsSrc).exists()) {
        await $`mv ${agentsSrc} ${projectRoot}/AGENTS.md`.quiet();
    }
    await repairAgentSymlinks(projectRoot);

    for (const m of ['app', 'lib', 'cli', 'mono']) {
        if (m === mode) continue;
        await rm(`${projectRoot}/docs/00_ADR-${m}.md`, { force: true });
    }
    const adrSrc = `${projectRoot}/docs/00_ADR-${mode}.md`;
    if (await Bun.file(adrSrc).exists()) {
        await $`mv ${adrSrc} ${projectRoot}/docs/00_ADR.md`.quiet();
    }

    await pruneModeScopedCapabilities(projectRoot, mode);
    await wireAgentSkillsSymlink(projectRoot);

    await rm(`${projectRoot}/bun.lock`, { force: true });

    const removableScripts = [
        'setup.ts',
        '_modes.ts',
        'clean.ts',
        'test-setup.ts',
        'ensure-scaffold-installs.ts',
        'ts-base.ts',
    ];
    if (mode !== 'lib') {
        removableScripts.push('fix-dist-esm-extensions.ts', 'smoke-dist-imports.ts');
    }
    for (const f of removableScripts) {
        await rm(`${projectRoot}/scripts/${f}`, { force: true });
    }
    await $`rmdir ${projectRoot}/scripts`.quiet().nothrow();
    const finalPkg = await readPackageJson(projectRoot);
    let changed = false;
    for (const entry of ['setup', 'clean', 'test:setup', 'pretest']) {
        if (finalPkg.scripts?.[entry]) {
            delete finalPkg.scripts[entry];
            changed = true;
        }
    }
    if (changed) {
        await writePackageJson(projectRoot, finalPkg);
    }

    return 0;
}
