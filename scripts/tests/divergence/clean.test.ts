import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test';
import { logger } from '../../lib/logger';

const _silentWas = logger.silent;
beforeAll(() => {
    logger.silent = true;
});
afterAll(() => {
    logger.silent = _silentWas;
});

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runClean } from '../../divergence/clean';

const tmpRoots: string[] = [];

async function tempDir(): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), 'ts-base-clean-'));
    tmpRoots.push(dir);
    return dir;
}

afterEach(async () => {
    await Promise.all(tmpRoots.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

describe('clean', () => {
    it('removes known targets that exist', async () => {
        const root = await tempDir();
        await mkdir(join(root, 'dist'));
        await writeFile(join(root, 'dist', 'index.js'), '// built');
        const code = await runClean(root);
        expect(code).toBe(0);
        expect(await Bun.file(join(root, 'dist')).exists()).toBe(false);
    });

    it('reports nothing to clean when targets are absent', async () => {
        const root = await tempDir();
        const code = await runClean(root);
        expect(code).toBe(0);
    });
});
