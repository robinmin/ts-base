import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test';
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
import { createRealRunner, runTestSetup, testEachMode, validateModes } from '../../divergence/test-setup';

const tmpRoots: string[] = [];

afterEach(async () => {
    await Promise.all(tmpRoots.splice(0).map((t) => rm(t, { recursive: true, force: true })));
});

async function tempDir(): Promise<string> {
    const t = await mkdtemp(join(tmpdir(), 'setup-test-'));
    tmpRoots.push(t);
    return t;
}

// ============================================================================
// validateModes
// ============================================================================

describe('validateModes', () => {
    it('returns all modes when args is empty', () => {
        expect(validateModes([])).toEqual(['app', 'lib', 'cli', 'mono']);
    });

    it('returns single valid mode', () => {
        expect(validateModes(['app'])).toEqual(['app']);
        expect(validateModes(['cli'])).toEqual(['cli']);
    });

    it('returns error string for invalid mode', () => {
        const result = validateModes(['bogus']);
        expect(typeof result).toBe('string');
        expect(result as string).toContain('bogus');
    });

    it('returns error for mixed valid and invalid args', () => {
        const result = validateModes(['app', 'bad']);
        expect(typeof result).toBe('string');
        expect(result as string).toContain('bad');
    });
});

// ============================================================================
// testEachMode
// ============================================================================

describe('testEachMode', () => {
    it('returns 0 when all modes pass', async () => {
        const calls: string[] = [];
        const code = await testEachMode(['app', 'lib'], async (mode, tmpDir) => {
            calls.push(mode);
            expect(tmpDir).toContain('ts-base-');
        });
        expect(code).toBe(0);
        expect(calls).toEqual(['app', 'lib']);
    });

    it('returns 1 when any mode fails', async () => {
        const code = await testEachMode(['app', 'cli'], async (mode) => {
            if (mode === 'cli') throw new Error('fail');
        });
        expect(code).toBe(1);
    });

    it('returns 1 when ALL modes fail', async () => {
        const code = await testEachMode(['app', 'lib', 'mono'], async () => {
            throw new Error('everything broke');
        });
        expect(code).toBe(1);
    });

    it('returns 0 for empty modes list', async () => {
        const code = await testEachMode([], async () => {
            throw new Error('should not be called');
        });
        expect(code).toBe(0);
    });
});

// ============================================================================
// runTestSetup
// ============================================================================

describe('runTestSetup', () => {
    it('returns 1 for invalid mode args', async () => {
        const root = await tempDir();
        const code = await runTestSetup(['bogus'], root);
        expect(code).toBe(1);
    });

    it('returns 0 when runner succeeds for all modes', async () => {
        const root = await tempDir();
        const calls: string[] = [];
        const code = await runTestSetup(['app', 'lib'], root, async (mode, tmpDir) => {
            calls.push(mode);
            expect(tmpDir).toContain('ts-base-');
        });
        expect(code).toBe(0);
        expect(calls).toEqual(['app', 'lib']);
    });

    it('returns 1 when runner fails for any mode', async () => {
        const root = await tempDir();
        const code = await runTestSetup(['app', 'cli'], root, async (mode) => {
            if (mode === 'cli') throw new Error('fail');
        });
        expect(code).toBe(1);
    });
});

// ============================================================================
// createRealRunner
// ============================================================================

describe('createRealRunner', () => {
    const tmpRoots: string[] = [];

    async function tempDir(): Promise<string> {
        const t = await mkdtemp(join(tmpdir(), 'runner-test-'));
        tmpRoots.push(t);
        return t;
    }

    afterAll(async () => {
        await Promise.all(tmpRoots.map((t) => rm(t, { recursive: true, force: true })));
    });

    it('returns a function', () => {
        const runner = createRealRunner('/tmp/fake-project');
        expect(typeof runner).toBe('function');
    });

    it('invokes the real runner against a minimal scaffold', async () => {
        // Create a minimal app scaffold that runSetupDirect can process.
        const scaffoldRoot = await tempDir();
        await mkdir(join(scaffoldRoot, 'src-app'), { recursive: true });
        await writeFile(join(scaffoldRoot, 'src-app', 'index.ts'), '// app\n');
        await mkdir(join(scaffoldRoot, 'src-lib'));
        await writeFile(join(scaffoldRoot, 'package.json'), JSON.stringify({ name: 'runner-test' }));
        // bun install's prepare hook needs lefthook. Copy the project's .prototools.
        const protoContents = await readFile(join(import.meta.dir, '../../../.prototools'), 'utf-8');
        await writeFile(join(scaffoldRoot, '.prototools'), protoContents);
        await mkdir(join(scaffoldRoot, 'src-monorepo'));
        await writeFile(join(scaffoldRoot, 'tsconfig.app.json'), '{}');
        await writeFile(join(scaffoldRoot, 'tsconfig.lib.json'), '{}');
        await writeFile(join(scaffoldRoot, 'tsconfig.template.json'), '{}');
        for (const m of ['app', 'lib', 'cli', 'mono']) {
            await mkdir(join(scaffoldRoot, '.github', `workflows-${m}`), { recursive: true });
            await writeFile(join(scaffoldRoot, '.github', `workflows-${m}`, 'ci.yml'), `# ${m}\n`);
        }
        for (const m of ['app', 'lib', 'cli', 'mono']) {
            await writeFile(join(scaffoldRoot, `AGENTS-${m}.md`), `# AGENTS ${m}\n`);
        }
        await mkdir(join(scaffoldRoot, 'docs'), { recursive: true });
        for (const m of ['app', 'lib', 'cli', 'mono']) {
            await writeFile(join(scaffoldRoot, 'docs', `00_ADR-${m}.md`), `# ADR ${m}\n`);
        }
        await writeFile(join(scaffoldRoot, 'bun.lock'), '');
        await mkdir(join(scaffoldRoot, 'scripts'), { recursive: true });
        for (const s of ['setup.ts', '_modes.ts', 'clean.ts', 'test-setup.ts', 'ensure-scaffold-installs.ts']) {
            await writeFile(join(scaffoldRoot, 'scripts', s), `// ${s}\n`);
        }
        await mkdir(join(scaffoldRoot, '.claude', 'skills', 'example'), { recursive: true });
        const runner = createRealRunner(scaffoldRoot);
        await runner('app', join(scaffoldRoot, 'work'));
    }, 60000); // 60s timeout for rsync + install
});
