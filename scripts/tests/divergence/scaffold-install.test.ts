import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test';
import { logger } from '../../lib/logger';

const _silentWas = logger.silent;
beforeAll(() => {
    logger.silent = true;
});
afterAll(() => {
    logger.silent = _silentWas;
});

import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runScaffoldInstall } from '../../divergence/scaffold-install';

const tmpRoots: string[] = [];

async function tempRoot(): Promise<string> {
    const root = await mkdtemp(join(tmpdir(), 'scaffold-install-'));
    tmpRoots.push(root);
    return root;
}

/** Create both scaffold structures with minimal package.json files. */
async function makeBothScaffolds(root: string): Promise<void> {
    for (const scaffold of [
        { dir: 'src-cli', packages: ['utils'] },
        { dir: 'src-monorepo', packages: ['api', 'config', 'db', 'utils'] },
    ]) {
        const scaffoldDir = join(root, scaffold.dir);
        await mkdir(scaffoldDir, { recursive: true });
        await writeFile(join(scaffoldDir, 'package.json'), '{}');
        await mkdir(join(scaffoldDir, 'node_modules'), { recursive: true });
        for (const pkg of scaffold.packages) {
            const pkgDir = join(scaffoldDir, 'packages', pkg);
            await mkdir(pkgDir, { recursive: true });
            await writeFile(join(pkgDir, 'package.json'), `{"name":"@SCOPE/${pkg}"}`);
        }
    }
}

afterEach(async () => {
    await Promise.all(tmpRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('runScaffoldInstall', () => {
    // runScaffoldInstall iterates both src-cli and src-monorepo (hardcoded).
    // Tests must create both scaffold dirs to avoid ENOENT from bun install.

    it('creates @SCOPE/* symlinks for src-cli packages', async () => {
        const root = await tempRoot();
        await makeBothScaffolds(root);

        await runScaffoldInstall(root);

        const link = join(root, 'src-cli', 'node_modules', '@SCOPE', 'utils');
        expect(existsSync(link)).toBe(true);
    });

    it('creates @SCOPE/* symlinks for src-monorepo packages', async () => {
        const root = await tempRoot();
        await makeBothScaffolds(root);

        await runScaffoldInstall(root);

        const scopeDir = join(root, 'src-monorepo', 'node_modules', '@SCOPE');
        const entries = await readdir(scopeDir);
        expect(entries.sort()).toEqual(['api', 'config', 'db', 'utils']);
    });

    it('does not clobber existing real directories', async () => {
        const root = await tempRoot();
        await makeBothScaffolds(root);

        // Create a real directory where the symlink would go.
        const scopeDir = join(root, 'src-cli', 'node_modules', '@SCOPE');
        await mkdir(join(scopeDir, 'utils'), { recursive: true });
        await writeFile(join(scopeDir, 'utils', 'marker.txt'), 'real');

        await runScaffoldInstall(root);

        const content = await readFile(join(scopeDir, 'utils', 'marker.txt'), 'utf-8');
        expect(content).toBe('real');
    });
});
