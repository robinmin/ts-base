import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { discoverCandidates } from '../../agent-convergence/discovery';

describe('discoverCode', () => {
    let tmp: string;

    beforeAll(async () => {
        tmp = await mkdtemp(join(tmpdir(), 'ts-base-discovery-test-'));
        await mkdir(join(tmp, 'src'), { recursive: true });
        await mkdir(join(tmp, 'scripts'), { recursive: true });
        await writeFile(join(tmp, 'src', 'utils.ts'), 'export const x = 1;\n');
        await writeFile(join(tmp, 'scripts', 'helper.ts'), 'export const y = 2;\n');
    });

    afterAll(async () => {
        await rm(tmp, { recursive: true, force: true });
    });

    it('discovers code candidates with typeFilter code', async () => {
        const candidates = await discoverCandidates({
            sourceProject: tmp,
            targetRoot: '/tmp/target',
            targetMode: 'mono',
            typeFilter: 'code',
            code: { roots: ['src', 'scripts'], maxFileBytes: 262_144, maxCandidates: 500 },
        });
        expect(candidates.map((candidate) => candidate.relativeSourcePath)).toEqual([
            'scripts/helper.ts',
            'src/utils.ts',
        ]);
        expect(candidates.every((candidate) => candidate.type === 'code')).toBe(true);
        expect(candidates.every((candidate) => candidate.destinationPath === null)).toBe(true);
        expect(candidates.every((candidate) => candidate.type !== 'code' || candidate.sourceDigest.length === 64)).toBe(
            true,
        );
    });

    it('sorts deterministically and truncates at maxCandidates', async () => {
        for (let i = 0; i < 5; i++) {
            await writeFile(join(tmp, 'src', `mod${i}.ts`), `export const v${i} = ${i};\n`);
        }
        const candidates = await discoverCandidates({
            sourceProject: tmp,
            targetRoot: '/tmp/target',
            targetMode: 'mono',
            typeFilter: 'code',
            code: { roots: ['src'], maxFileBytes: 262_144, maxCandidates: 2 },
        });
        expect(candidates.map((candidate) => candidate.relativeSourcePath)).toEqual(['src/mod0.ts', 'src/mod1.ts']);
    });

    it('skips code discovery when typeFilter excludes code', async () => {
        const candidates = await discoverCandidates({
            sourceProject: tmp,
            targetRoot: '/tmp/target',
            targetMode: 'mono',
            typeFilter: 'skills',
        });
        expect(candidates.every((c) => c.type !== 'code')).toBe(true);
    });

    it('rejects escaping roots and excludes oversized files and symlinks outside source', async () => {
        const outside = await mkdtemp(join(tmpdir(), 'ts-base-discovery-outside-'));
        await writeFile(join(outside, 'secret.ts'), 'export const secret = 1;\n');
        await symlink(join(outside, 'secret.ts'), join(tmp, 'src', 'outside.ts'));
        await writeFile(join(tmp, 'src', 'large.ts'), 'x'.repeat(20));

        await expect(
            discoverCandidates({
                sourceProject: tmp,
                targetRoot: '/tmp/target',
                targetMode: 'mono',
                typeFilter: 'code',
                code: { roots: ['../'], maxFileBytes: 10, maxCandidates: 500 },
            }),
        ).rejects.toThrow('escapes base directory');

        const candidates = await discoverCandidates({
            sourceProject: tmp,
            targetRoot: '/tmp/target',
            targetMode: 'mono',
            typeFilter: 'code',
            code: { roots: ['src'], maxFileBytes: 10, maxCandidates: 500 },
        });
        expect(candidates.map((candidate) => candidate.relativeSourcePath)).not.toContain('src/outside.ts');
        expect(candidates.map((candidate) => candidate.relativeSourcePath)).not.toContain('src/large.ts');
        await rm(outside, { recursive: true, force: true });
    });
});
