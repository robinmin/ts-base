import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { logger } from '../../lib/logger';

const _silentWas = logger.silent;
beforeAll(() => {
    logger.silent = true;
});
afterAll(() => {
    logger.silent = _silentWas;
});

import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
    deriveScope,
    normalizePromotedScopeImports,
    parseCleanupFlags,
    parseModeArg,
    patchApp,
    patchLib,
    promoteTsconfig,
    readPackageJson,
    writeLibExtras,
    writePackageJson,
} from '../../divergence/setup';

// ============================================================================
// parseModeArg
// ============================================================================

describe('parseModeArg', () => {
    it('returns "app" for --mode=app', () => {
        expect(parseModeArg(['--mode=app'])).toBe('app');
    });

    it('returns "lib" for --mode=lib', () => {
        expect(parseModeArg(['--mode=lib'])).toBe('lib');
    });

    it('returns "cli" for --mode=cli', () => {
        expect(parseModeArg(['--mode=cli'])).toBe('cli');
    });

    it('returns "mono" for --mode=mono', () => {
        expect(parseModeArg(['--mode=mono'])).toBe('mono');
    });

    it('returns undefined when no --mode flag', () => {
        expect(parseModeArg([])).toBeUndefined();
        expect(parseModeArg(['--other', 'value'])).toBeUndefined();
    });

    it('returns undefined when --mode is missing value', () => {
        expect(parseModeArg(['--mode='])).toBeUndefined();
    });

    it('finds --mode= among other flags', () => {
        expect(parseModeArg(['--no-db', '--mode=lib', '--no-config'])).toBe('lib');
    });
});

// ============================================================================
// parseCleanupFlags
// ============================================================================

describe('parseCleanupFlags', () => {
    it('returns both false by default', () => {
        const flags = parseCleanupFlags([]);
        expect(flags.noDb).toBe(false);
        expect(flags.noConfig).toBe(false);
    });

    it('returns noDb=true when --no-db present', () => {
        const flags = parseCleanupFlags(['--no-db']);
        expect(flags.noDb).toBe(true);
        expect(flags.noConfig).toBe(false);
    });

    it('returns noConfig=true when --no-config present', () => {
        const flags = parseCleanupFlags(['--no-config']);
        expect(flags.noDb).toBe(false);
        expect(flags.noConfig).toBe(true);
    });

    it('returns both when both flags present', () => {
        const flags = parseCleanupFlags(['--no-db', '--no-config']);
        expect(flags.noDb).toBe(true);
        expect(flags.noConfig).toBe(true);
    });
});

// ============================================================================
// deriveScope
// ============================================================================

describe('deriveScope', () => {
    it('returns "app" for undefined', () => {
        expect(deriveScope(undefined)).toBe('app');
    });

    it('returns "app" for null', () => {
        expect(deriveScope(null)).toBe('app');
    });

    it('returns "app" for empty string', () => {
        expect(deriveScope('')).toBe('app');
    });

    it('returns "app" for a number', () => {
        expect(deriveScope(42)).toBe('app');
    });

    it('strips @scope prefix', () => {
        expect(deriveScope('@myorg/my-app')).toBe('myorg');
    });

    it('strips @scope and takes only first part', () => {
        expect(deriveScope('@scope/pkg')).toBe('scope');
    });

    it('keeps bare name', () => {
        expect(deriveScope('my-project')).toBe('my-project');
    });

    it('lowercases', () => {
        expect(deriveScope('MyProject')).toBe('myproject');
    });

    it('replaces invalid chars with hyphens', () => {
        expect(deriveScope('hello world!')).toBe('hello-world-');
    });

    it('replaces all invalid chars — non-empty result kept', () => {
        expect(deriveScope('!!!')).toBe('---');
    });
});

// ============================================================================
// normalizePromotedScopeImports
// ============================================================================

describe('normalizePromotedScopeImports', () => {
    const scope = 'myscope';

    it('rewrites api type import ordering for @orpc/client block', () => {
        const input =
            `import type { planetContract } from '@${scope}/api';\n` +
            `import { createORPCClient } from '@orpc/client';\n` +
            `import { RPCLink } from '@orpc/client/fetch';\n` +
            `import type { ContractRouterClient } from '@orpc/contract';`;
        const result = normalizePromotedScopeImports(input, scope);
        expect(result).toContain(
            `import { createORPCClient } from '@orpc/client';\n` +
                `import { RPCLink } from '@orpc/client/fetch';\n` +
                `import type { ContractRouterClient } from '@orpc/contract';\n` +
                `import type { planetContract } from '@${scope}/api';`,
        );
    });

    it('rewrites planet type + planet import ordering for @orpc/server block', () => {
        const input =
            `import type { Planet } from '@${scope}/api';\n` +
            `import { planetContract } from '@${scope}/api';\n` +
            `import { implement, ORPCError } from '@orpc/server';`;
        const result = normalizePromotedScopeImports(input, scope);
        expect(result).toContain(
            `import { implement, ORPCError } from '@orpc/server';\n` +
                `import type { Planet } from '@${scope}/api';\n` +
                `import { planetContract } from '@${scope}/api';`,
        );
    });

    it('rewrites zod + oc import ordering for @orpc/contract block', () => {
        const input = `import { z } from '@${scope}/utils';\nimport { oc } from '@orpc/contract';`;
        const result = normalizePromotedScopeImports(input, scope);
        expect(result).toContain(`import { oc } from '@orpc/contract';\nimport { z } from '@${scope}/utils';`);
    });

    it('is idempotent — already-normalized text unchanged', () => {
        const input =
            `import { createORPCClient } from '@orpc/client';\n` +
            `import { RPCLink } from '@orpc/client/fetch';\n` +
            `import type { ContractRouterClient } from '@orpc/contract';\n` +
            `import type { planetContract } from '@${scope}/api';`;
        expect(normalizePromotedScopeImports(input, scope)).toBe(input);
    });
});

// ============================================================================
// patchApp
// ============================================================================

describe('patchApp', () => {
    it('sets scripts to APP_SCRIPTS', () => {
        const pkg: Record<string, unknown> = {};
        patchApp(pkg, { noDb: false, noConfig: false });
        expect(pkg.scripts).toBeDefined();
    });

    it('deletes @libsql/client when noDb flag and dependency exists', () => {
        const pkg: Record<string, unknown> = {
            dependencies: { '@libsql/client': '^1', zod: '^3' },
        };
        patchApp(pkg, { noDb: true, noConfig: false });
        expect((pkg.dependencies as Record<string, string>)['@libsql/client']).toBeUndefined();
        expect((pkg.dependencies as Record<string, string>).zod).toBe('^3');
    });

    it('deletes entire dependencies object when noDb removes last dep', () => {
        const pkg: Record<string, unknown> = {
            dependencies: { '@libsql/client': '^1' },
        };
        patchApp(pkg, { noDb: true, noConfig: false });
        expect(pkg.dependencies).toBeUndefined();
    });

    it('deletes zod when noConfig flag and dependency exists', () => {
        const pkg: Record<string, unknown> = {
            dependencies: { zod: '^3', '@libsql/client': '^1' },
        };
        patchApp(pkg, { noDb: false, noConfig: true });
        expect((pkg.dependencies as Record<string, string>).zod).toBeUndefined();
        expect((pkg.dependencies as Record<string, string>)['@libsql/client']).toBe('^1');
    });

    it('deletes entire dependencies when noConfig removes last dep (zod only)', () => {
        const pkg: Record<string, unknown> = {
            dependencies: { zod: '^3' },
        };
        patchApp(pkg, { noDb: false, noConfig: true });
        expect(pkg.dependencies).toBeUndefined();
    });

    it('does nothing to dependencies when flags are false', () => {
        const pkg: Record<string, unknown> = {
            dependencies: { zod: '^3', '@libsql/client': '^1' },
        };
        patchApp(pkg, { noDb: false, noConfig: false });
        expect(pkg.dependencies).toEqual({ zod: '^3', '@libsql/client': '^1' });
    });

    it('does nothing when dependencies are missing entirely', () => {
        const pkg: Record<string, unknown> = {};
        patchApp(pkg, { noDb: true, noConfig: true });
        expect(pkg.dependencies).toBeUndefined();
    });
});

// ============================================================================
// patchLib
// ============================================================================

describe('patchLib', () => {
    it('sets private to false and type to module', () => {
        const pkg: Record<string, unknown> = {};
        patchLib(pkg);
        expect(pkg.private).toBe(false);
        expect(pkg.type).toBe('module');
    });

    it('sets version to 0.0.0 when missing', () => {
        const pkg: Record<string, unknown> = {};
        patchLib(pkg);
        expect(pkg.version).toBe('0.0.0');
    });

    it('preserves existing version', () => {
        const pkg: Record<string, unknown> = { version: '1.2.3' };
        patchLib(pkg);
        expect(pkg.version).toBe('1.2.3');
    });

    it('sets exports with . and ./browser entries', () => {
        const pkg: Record<string, unknown> = {};
        patchLib(pkg);
        const exports = pkg.exports as Record<string, unknown>;
        expect(exports).toBeDefined();
        expect(exports['.']).toBeDefined();
        expect(exports['./browser']).toBeDefined();
    });

    it('sets types, browser, sideEffects, files', () => {
        const pkg: Record<string, unknown> = {};
        patchLib(pkg);
        expect(pkg.types).toBe('./dist/index.d.ts');
        expect(pkg.browser).toBe('./dist/browser.js');
        expect(pkg.sideEffects).toBe(false);
        expect(pkg.files).toEqual(['dist']);
    });

    it('removes size-limit key', () => {
        const pkg: Record<string, unknown> = { 'size-limit': [{ limit: '10KB' }] };
        patchLib(pkg);
        expect(pkg['size-limit']).toBeUndefined();
    });

    it('removes zod from dependencies', () => {
        const pkg: Record<string, unknown> = {
            dependencies: { zod: '^3' },
        };
        patchLib(pkg);
        expect(pkg.dependencies).toBeUndefined();
    });

    it('keeps other dependencies when removing zod', () => {
        const pkg: Record<string, unknown> = {
            dependencies: { zod: '^3', 'some-lib': '^1' },
        };
        patchLib(pkg);
        const deps = pkg.dependencies as Record<string, string>;
        expect(deps.zod).toBeUndefined();
        expect(deps['some-lib']).toBe('^1');
    });

    it('adds typescript to peerDependencies', () => {
        const pkg: Record<string, unknown> = {};
        patchLib(pkg);
        const peer = pkg.peerDependencies as Record<string, string>;
        expect(peer.typescript).toBe('>=5.4 <7');
    });

    it('preserves existing peerDependencies', () => {
        const pkg: Record<string, unknown> = {
            peerDependencies: { react: '^18' },
        };
        patchLib(pkg);
        const peer = pkg.peerDependencies as Record<string, string>;
        expect(peer.react).toBe('^18');
        expect(peer.typescript).toBe('>=5.4 <7');
    });
});

// ============================================================================
// readPackageJson / writePackageJson (integration — temp dir)
// ============================================================================

describe('readPackageJson / writePackageJson', () => {
    const tmpRoots: string[] = [];

    async function tempDir(): Promise<string> {
        const t = await mkdtemp(join(tmpdir(), 'setup-test-'));
        tmpRoots.push(t);
        return t;
    }

    afterAll(async () => {
        await Promise.all(tmpRoots.map((t) => rm(t, { recursive: true, force: true })));
    });

    it('reads and writes package.json round-trip', async () => {
        const root = await tempDir();
        const original = { name: 'test-pkg', version: '1.0.0', private: true };
        await writeFile(join(root, 'package.json'), JSON.stringify(original));

        const pkg = await readPackageJson(root);
        expect(pkg.name).toBe('test-pkg');
        expect(pkg.version).toBe('1.0.0');
        expect(pkg.private).toBe(true);

        pkg.version = '2.0.0';
        await writePackageJson(root, pkg);

        const roundTripped = await readPackageJson(root);
        expect(roundTripped.version).toBe('2.0.0');
        expect(roundTripped.name).toBe('test-pkg');
    });

    it('writePackageJson formats with 4-space indent and trailing newline', async () => {
        const root = await tempDir();
        await writePackageJson(root, { name: 'fmt-test' });
        const raw = await readFile(join(root, 'package.json'), 'utf-8');
        expect(raw).toBe('{\n    "name": "fmt-test"\n}\n');
    });
});

// ============================================================================
// promoteTsconfig (integration — temp dir)
// ============================================================================

describe('promoteTsconfig', () => {
    const tmpRoots: string[] = [];

    async function tempDir(): Promise<string> {
        const t = await mkdtemp(join(tmpdir(), 'setup-test-tsconfig-'));
        tmpRoots.push(t);
        return t;
    }

    afterAll(async () => {
        await Promise.all(tmpRoots.map((t) => rm(t, { recursive: true, force: true })));
    });

    it('promotes app tsconfig and removes extras', async () => {
        const root = await tempDir();
        await writeFile(join(root, 'tsconfig.app.json'), '{"extends":"./tsconfig.base"}');
        await writeFile(join(root, 'tsconfig.lib.json'), 'should-be-removed');
        await writeFile(join(root, 'tsconfig.template.json'), 'should-be-removed');

        await promoteTsconfig(root, 'app');

        const result = JSON.parse(await readFile(join(root, 'tsconfig.json'), 'utf-8'));
        expect(result).toEqual({ extends: './tsconfig.base' });

        expect(await Bun.file(join(root, 'tsconfig.app.json')).exists()).toBe(false);
        expect(await Bun.file(join(root, 'tsconfig.lib.json')).exists()).toBe(false);
        expect(await Bun.file(join(root, 'tsconfig.template.json')).exists()).toBe(false);
    });

    it('promotes lib tsconfig', async () => {
        const root = await tempDir();
        await writeFile(join(root, 'tsconfig.lib.json'), '{"compilerOptions":{"outDir":"dist"}}');
        await writeFile(join(root, 'tsconfig.app.json'), 'should-be-removed');
        await writeFile(join(root, 'tsconfig.template.json'), 'should-be-removed');

        await promoteTsconfig(root, 'lib');

        const result = JSON.parse(await readFile(join(root, 'tsconfig.json'), 'utf-8'));
        expect(result).toEqual({ compilerOptions: { outDir: 'dist' } });
    });
});

// ============================================================================
// writeLibExtras (integration — temp dir)
// ============================================================================

describe('writeLibExtras', () => {
    const tmpRoots: string[] = [];

    async function tempDir(): Promise<string> {
        const t = await mkdtemp(join(tmpdir(), 'setup-test-libextras-'));
        tmpRoots.push(t);
        return t;
    }

    afterAll(async () => {
        await Promise.all(tmpRoots.map((t) => rm(t, { recursive: true, force: true })));
    });

    it('promotes lib extras with scope + version substitution', async () => {
        const root = await tempDir();
        await writeFile(join(root, 'package.json'), JSON.stringify({ name: '@myorg/my-lib', version: '2.5.1' }));
        const srcDir = join(root, 'src');
        await mkdir(srcDir);

        await writeFile(join(srcDir, 'release-please-config.json'), '{"packages":{".":{}}}');
        await writeFile(join(srcDir, '.release-please-manifest.json'), '{".":"0.0.0"}');
        await writeFile(join(srcDir, 'jsr.json'), '{"name":"@SCOPE/mylib","version":"0.0.0"}');

        await writeLibExtras(root);

        // release-please-config.json promoted unchanged
        const rpConfig = JSON.parse(await readFile(join(root, 'release-please-config.json'), 'utf-8'));
        expect(rpConfig).toEqual({ packages: { '.': {} } });

        // .release-please-manifest.json gets version substitution
        const manifest = await readFile(join(root, '.release-please-manifest.json'), 'utf-8');
        expect(JSON.parse(manifest)).toEqual({ '.': '2.5.1' });

        // jsr.json gets scope + version substitution
        const jsr = JSON.parse(await readFile(join(root, 'jsr.json'), 'utf-8'));
        expect(jsr).toEqual({ name: '@myorg/mylib', version: '2.5.1' });

        // Source files removed
        expect(await Bun.file(join(srcDir, 'release-please-config.json')).exists()).toBe(false);
        expect(await Bun.file(join(srcDir, '.release-please-manifest.json')).exists()).toBe(false);
        expect(await Bun.file(join(srcDir, 'jsr.json')).exists()).toBe(false);
    });

    it('defaults version to 0.0.0 when package.json has no version', async () => {
        const root = await tempDir();
        await writeFile(join(root, 'package.json'), JSON.stringify({ name: 'my-lib' }));
        const srcDir = join(root, 'src');
        await mkdir(srcDir);
        await writeFile(join(srcDir, '.release-please-manifest.json'), '{".":"0.0.0"}');
        await writeFile(join(srcDir, 'release-please-config.json'), '{}');
        await writeFile(join(srcDir, 'jsr.json'), '{"name":"@SCOPE/mylib","version":"0.0.0"}');

        await writeLibExtras(root);

        const manifest = JSON.parse(await readFile(join(root, '.release-please-manifest.json'), 'utf-8'));
        expect(manifest).toEqual({ '.': '0.0.0' });
    });
});

// ============================================================================
// runSetupDirect — integration test with minimal scaffold
// ============================================================================

import { runSetupDirect } from '../../divergence/setup';

describe('runSetupDirect (app mode)', () => {
    const tmpRoots: string[] = [];

    async function tempDir(): Promise<string> {
        const t = await mkdtemp(join(tmpdir(), 'setup-direct-'));
        tmpRoots.push(t);
        return t;
    }

    afterAll(async () => {
        await Promise.all(tmpRoots.map((t) => rm(t, { recursive: true, force: true })));
    });

    /** Create the minimal file tree runSetupDirect needs for app mode. */
    async function scaffoldApp(root: string): Promise<void> {
        // Source scaffold — setupFlat does `mv src-app src`
        await mkdir(join(root, 'src-app'), { recursive: true });
        await writeFile(join(root, 'src-app', 'index.ts'), '// app entry\n');
        // Drop scaffolds (must exist for rm)
        await mkdir(join(root, 'src-lib'));
        await mkdir(join(root, 'src-cli'));
        await mkdir(join(root, 'src-monorepo'));
        // package.json with name needed for deriveScope + capabilites
        await writeFile(join(root, 'package.json'), JSON.stringify({ name: 'my-test-app' }));
        // tsconfig variants
        await writeFile(join(root, 'tsconfig.app.json'), '{}');
        await writeFile(join(root, 'tsconfig.lib.json'), '{}');
        await writeFile(join(root, 'tsconfig.template.json'), '{}');
        // Workflow dirs
        await mkdir(join(root, '.github'), { recursive: true });
        for (const m of ['app', 'lib', 'cli', 'mono']) {
            await mkdir(join(root, '.github', `workflows-${m}`), { recursive: true });
            await writeFile(join(root, '.github', `workflows-${m}`, 'ci.yml'), `# ${m} ci\n`);
        }
        // AGENTS files
        for (const m of ['app', 'lib', 'cli', 'mono']) {
            await writeFile(join(root, `AGENTS-${m}.md`), `# AGENTS ${m}\n`);
        }
        // ADR files
        await mkdir(join(root, 'docs'), { recursive: true });
        for (const m of ['app', 'lib', 'cli', 'mono']) {
            await writeFile(join(root, 'docs', `00_ADR-${m}.md`), `# ADR ${m}\n`);
        }
        // bun.lock (will be deleted)
        await writeFile(join(root, 'bun.lock'), '');
        // Scripts dir with removable files
        await mkdir(join(root, 'scripts'), { recursive: true });
        for (const s of ['setup.ts', '_modes.ts', 'clean.ts', 'test-setup.ts', 'ensure-scaffold-installs.ts']) {
            await writeFile(join(root, 'scripts', s), `// ${s}\n`);
        }
        // Agent capabilities dir
        await mkdir(join(root, '.claude', 'skills', 'example'), { recursive: true });
        await writeFile(join(root, '.claude', 'skills', 'example', 'SKILL.md'), '# Example\n');
    }

    it('runs app-mode setup end to end', async () => {
        const root = await tempDir();
        await scaffoldApp(root);

        const code = await runSetupDirect('app', { noDb: false, noConfig: false }, root);
        expect(code).toBe(0);

        // src-app promoted to src/
        expect(await Bun.file(join(root, 'src', 'index.ts')).exists()).toBe(true);
        // Scaffold dirs removed
        expect(await Bun.file(join(root, 'src-app', 'index.ts')).exists()).toBe(false);
        expect(await Bun.file(join(root, 'src-lib')).exists()).toBe(false);
        // AGENTS.md swapped
        expect(await Bun.file(join(root, 'AGENTS.md')).exists()).toBe(true);
        expect(await Bun.file(join(root, 'AGENTS-app.md')).exists()).toBe(false);
        // ADR swapped
        expect(await Bun.file(join(root, 'docs', '00_ADR.md')).exists()).toBe(true);
        // bun.lock removed
        expect(await Bun.file(join(root, 'bun.lock')).exists()).toBe(false);
    });

    it('runs app-mode with --no-db and --no-config flags', async () => {
        const root = await tempDir();
        await scaffoldApp(root);
        // Add deps so we can verify stripping
        await writeFile(
            join(root, 'package.json'),
            JSON.stringify({
                name: 'my-test-app',
                dependencies: { '@libsql/client': '^1', zod: '^3' },
            }),
        );

        const code = await runSetupDirect('app', { noDb: true, noConfig: true }, root);
        expect(code).toBe(0);

        const pkg = await readPackageJson(root);
        expect(pkg.dependencies).toBeUndefined();
    });
});

// ============================================================================
// runSetupDirect — lib mode
// ============================================================================

describe('runSetupDirect (lib mode)', () => {
    const tmpRoots: string[] = [];

    async function tempDir(): Promise<string> {
        const t = await mkdtemp(join(tmpdir(), 'setup-lib-'));
        tmpRoots.push(t);
        return t;
    }

    afterAll(async () => {
        await Promise.all(tmpRoots.map((t) => rm(t, { recursive: true, force: true })));
    });

    async function scaffoldLib(root: string): Promise<void> {
        await mkdir(join(root, 'src-lib'), { recursive: true });
        await writeFile(join(root, 'src-lib', 'index.ts'), 'export {};\n');
        await writeFile(join(root, 'src-lib', 'internal.ts'), 'export {};\n');
        // writeLibExtras needs these in src/
        await mkdir(join(root, 'src-lib', 'src'), { recursive: true }); // wait — no
        // writeLibExtras reads from root/src/ AFTER promotion
        // Actually, writeLibExtras reads from root/src/X, but it's called
        // after setupFlat does mv src-lib → src. Then writeLibExtras reads from
        // the promoted src/ dir. So I need to have the files in src-lib/src/
        // or the files get moved.
        // Actually: setupFlat does mv src-lib → src. Then writeLibExtras
        // reads from root/src/release-please-config.json etc.
        // So I need: src-lib/release-please-config.json (gets moved to src/)
        await writeFile(join(root, 'src-lib', 'release-please-config.json'), '{}');
        await writeFile(join(root, 'src-lib', '.release-please-manifest.json'), '{".":"0.0.0"}');
        await writeFile(join(root, 'src-lib', 'jsr.json'), '{"name":"@SCOPE/lib","version":"0.0.0"}');
        // Drop scaffolds
        await mkdir(join(root, 'src-app'));
        await mkdir(join(root, 'src-cli'));
        await mkdir(join(root, 'src-monorepo'));
        await writeFile(join(root, 'package.json'), JSON.stringify({ name: '@test/lib' }));
        await writeFile(join(root, 'tsconfig.lib.json'), '{}');
        await writeFile(join(root, 'tsconfig.app.json'), '{}');
        await writeFile(join(root, 'tsconfig.template.json'), '{}');
        // tsdown + build for lib cleanup
        await writeFile(join(root, 'tsdown.config.ts'), '');
        await writeFile(join(root, 'tsconfig.build.json'), '');
        await mkdir(join(root, '.github'), { recursive: true });
        for (const m of ['app', 'lib', 'cli', 'mono']) {
            await mkdir(join(root, '.github', `workflows-${m}`), { recursive: true });
            await writeFile(join(root, '.github', `workflows-${m}`, 'ci.yml'), `# ${m}\n`);
        }
        for (const m of ['app', 'lib', 'cli', 'mono']) {
            await writeFile(join(root, `AGENTS-${m}.md`), `# AGENTS ${m}\n`);
        }
        await mkdir(join(root, 'docs'), { recursive: true });
        for (const m of ['app', 'lib', 'cli', 'mono']) {
            await writeFile(join(root, 'docs', `00_ADR-${m}.md`), `# ADR ${m}\n`);
        }
        await writeFile(join(root, 'bun.lock'), '');
        await mkdir(join(root, 'scripts'), { recursive: true });
        for (const s of [
            'setup.ts',
            '_modes.ts',
            'clean.ts',
            'test-setup.ts',
            'ensure-scaffold-installs.ts',
            'fix-dist-esm-extensions.ts',
            'smoke-dist-imports.ts',
        ]) {
            await writeFile(join(root, 'scripts', s), `// ${s}\n`);
        }
        await mkdir(join(root, '.claude', 'skills', 'example'), { recursive: true });
        await writeFile(join(root, '.claude', 'skills', 'example', 'SKILL.md'), '# Example\n');
    }

    it('runs lib-mode setup end to end', async () => {
        const root = await tempDir();
        await scaffoldLib(root);

        const code = await runSetupDirect('lib', { noDb: false, noConfig: false }, root);
        expect(code).toBe(0);

        // src-lib promoted to src/
        expect(await Bun.file(join(root, 'src', 'index.ts')).exists()).toBe(true);
        // Fix scripts kept for lib mode (only removed for non-lib)
        expect(await Bun.file(join(root, 'scripts', 'fix-dist-esm-extensions.ts')).exists()).toBe(true);
    });
});

// ============================================================================
// runSetupDirect — cli mode (workspace)
// ============================================================================

describe('runSetupDirect (cli mode)', () => {
    const tmpRoots: string[] = [];

    async function tempDir(): Promise<string> {
        const t = await mkdtemp(join(tmpdir(), 'setup-cli-'));
        tmpRoots.push(t);
        return t;
    }

    afterAll(async () => {
        await Promise.all(tmpRoots.map((t) => rm(t, { recursive: true, force: true })));
    });

    async function scaffoldCli(root: string): Promise<void> {
        // Workspace structure under src-cli/
        await mkdir(join(root, 'src-cli', 'apps', 'cli'), { recursive: true });
        await mkdir(join(root, 'src-cli', 'packages', 'utils'), { recursive: true });
        await mkdir(join(root, 'src-cli', 'tooling'), { recursive: true });
        await writeFile(join(root, 'src-cli', 'package.json'), JSON.stringify({ name: 'cli-root' }));
        // Other scaffolds for rm
        await mkdir(join(root, 'src-app'));
        await writeFile(join(root, 'src-cli', 'apps', 'cli', 'index.ts'), 'export {};');
        await writeFile(join(root, 'src-cli', 'packages', 'utils', 'index.ts'), 'export {};');
        await writeFile(join(root, 'package.json'), JSON.stringify({ name: '@test/cli' }));
        await writeFile(join(root, 'tsconfig.app.json'), '{}');
        await writeFile(join(root, 'tsconfig.lib.json'), '{}');
        await writeFile(join(root, 'src-cli', 'package.json'), JSON.stringify({ name: 'cli-root' }));
        await mkdir(join(root, '.github'), { recursive: true });
        for (const m of ['app', 'lib', 'cli', 'mono']) {
            await mkdir(join(root, '.github', `workflows-${m}`), { recursive: true });
            await writeFile(join(root, '.github', `workflows-${m}`, 'ci.yml'), `# ${m}\n`);
        }
        for (const m of ['app', 'lib', 'cli', 'mono']) {
            await writeFile(join(root, `AGENTS-${m}.md`), `# AGENTS ${m}\n`);
        }
        await mkdir(join(root, 'docs'), { recursive: true });
        for (const m of ['app', 'lib', 'cli', 'mono']) {
            await writeFile(join(root, 'docs', `00_ADR-${m}.md`), `# ADR ${m}\n`);
        }
        await writeFile(join(root, 'bun.lock'), '');
        await mkdir(join(root, 'scripts'), { recursive: true });
        for (const s of [
            'setup.ts',
            '_modes.ts',
            'clean.ts',
            'test-setup.ts',
            'ensure-scaffold-installs.ts',
            'fix-dist-esm-extensions.ts',
            'smoke-dist-imports.ts',
        ]) {
            await writeFile(join(root, 'scripts', s), `// ${s}\n`);
        }
        await mkdir(join(root, '.claude', 'skills', 'example'), { recursive: true });
        await writeFile(join(root, '.claude', 'skills', 'example', 'SKILL.md'), '# Example\n');
    }

    it('runs cli-mode setup end to end', async () => {
        const root = await tempDir();
        await scaffoldCli(root);

        const code = await runSetupDirect('cli', { noDb: false, noConfig: false }, root);
        expect(code).toBe(0);

        // Workspace promoted — check files inside packages and apps
        expect(await Bun.file(join(root, 'packages', 'utils', 'index.ts')).exists()).toBe(true);
        expect(await Bun.file(join(root, 'apps', 'cli', 'index.ts')).exists()).toBe(true);
        // src-cli removed after promotion
        expect(await Bun.file(join(root, 'src-cli')).exists()).toBe(false);
    });
});

// ============================================================================
// runSetup — CLI entry point with args
// ============================================================================

import { runSetup } from '../../divergence/setup';

describe('runSetup (CLI entry)', () => {
    const tmpRoots: string[] = [];

    async function tempDir(): Promise<string> {
        const t = await mkdtemp(join(tmpdir(), 'setup-run-'));
        tmpRoots.push(t);
        return t;
    }

    afterAll(async () => {
        await Promise.all(tmpRoots.map((t) => rm(t, { recursive: true, force: true })));
    });

    it('runs full setup via CLI args for app mode', async () => {
        const root = await tempDir();
        // Minimal app scaffold — same as runSetupDirect app test
        await mkdir(join(root, 'src-app'), { recursive: true });
        await writeFile(join(root, 'src-app', 'index.ts'), '// app\n');
        await mkdir(join(root, 'src-lib'));
        await mkdir(join(root, 'src-cli'));
        await mkdir(join(root, 'src-monorepo'));
        await writeFile(join(root, 'package.json'), JSON.stringify({ name: 'my-app' }));
        await writeFile(join(root, 'tsconfig.app.json'), '{}');
        await writeFile(join(root, 'tsconfig.lib.json'), '{}');
        await writeFile(join(root, 'tsconfig.template.json'), '{}');
        await mkdir(join(root, '.github'), { recursive: true });
        for (const m of ['app', 'lib', 'cli', 'mono']) {
            await mkdir(join(root, '.github', `workflows-${m}`), { recursive: true });
            await writeFile(join(root, '.github', `workflows-${m}`, 'ci.yml'), `# ${m}\n`);
        }
        for (const m of ['app', 'lib', 'cli', 'mono']) {
            await writeFile(join(root, `AGENTS-${m}.md`), `# AGENTS ${m}\n`);
        }
        await mkdir(join(root, 'docs'), { recursive: true });
        for (const m of ['app', 'lib', 'cli', 'mono']) {
            await writeFile(join(root, 'docs', `00_ADR-${m}.md`), `# ADR ${m}\n`);
        }
        await writeFile(join(root, 'bun.lock'), '');
        await mkdir(join(root, 'scripts'), { recursive: true });
        for (const s of ['setup.ts', '_modes.ts', 'clean.ts', 'test-setup.ts', 'ensure-scaffold-installs.ts']) {
            await writeFile(join(root, 'scripts', s), `// ${s}\n`);
        }
        await mkdir(join(root, '.claude', 'skills', 'example'), { recursive: true });
        await writeFile(join(root, '.claude', 'skills', 'example', 'SKILL.md'), '# Example\n');

        const code = await runSetup(['--mode=app', '--no-db'], root);
        expect(code).toBe(0);
        expect(await Bun.file(join(root, 'src', 'index.ts')).exists()).toBe(true);
    });
});
