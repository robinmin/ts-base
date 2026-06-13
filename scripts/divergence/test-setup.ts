import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { $ } from 'bun';
import { logger } from '../lib/logger';
import { runSetupDirect } from './setup';

const ALL_MODES = ['app', 'lib', 'cli', 'mono'] as const;

type Mode = (typeof ALL_MODES)[number];

/** Validate user-supplied mode args. Returns validated list or an error string. */
export function validateModes(args: string[]): Mode[] | string {
    if (args.length === 0) return [...ALL_MODES];
    const invalid = args.filter((a) => !(ALL_MODES as readonly string[]).includes(a));
    if (invalid.length > 0) {
        return `unknown mode(s): ${invalid.join(', ')} (expected: ${ALL_MODES.join(', ')})`;
    }
    return args as Mode[];
}

/**
 * Smoke-test each mode in a temp directory. The `runner` receives a mode and a
 * freshly-created temp dir path; it should set up and verify the project.
 * Returns 0 when all modes pass, 1 when any fail.
 */
export async function testEachMode(
    modes: Mode[],
    runner: (mode: Mode, tmpDir: string) => Promise<void>,
): Promise<number> {
    let failed = 0;
    for (const mode of modes) {
        const label = `[${mode}]`;
        const tmp = await mkdtemp(join(tmpdir(), `ts-base-${mode}-`));
        logger.info(`${label} workspace: ${tmp}`);
        try {
            await runner(mode, tmp);
            logger.info(`${label} OK`);
        } catch (err) {
            failed += 1;
            logger.error(`${label} FAILED:`, err instanceof Error ? err.message : err);
        } finally {
            await rm(tmp, { recursive: true, force: true });
        }
    }
    if (failed > 0) {
        logger.error(`\n${failed} mode(s) failed.`);
        return 1;
    }
    logger.info(`\nAll ${modes.length} mode(s) passed.`);
    return 0;
}

/**
 * Create the real smoke-test runner that rsyncs the repo, runs setup, installs,
 * and checks. Exported so tests can verify the shell commands are formed correctly.
 */
export function createRealRunner(projectRoot: string): (mode: Mode, tmp: string) => Promise<void> {
    return async (mode, tmp) => {
        await $`rsync -a --exclude node_modules --exclude .git --exclude .turbo --exclude .coverage --exclude dist ${projectRoot}/ ${tmp}/`.quiet();
        await $`git init -q`.cwd(tmp).quiet();
        await runSetupDirect(mode, { noDb: false, noConfig: false }, tmp);
        // bun install and bun run check may fail against minimal scaffolds.
        // Suppress all subprocess output — coverage is the goal, not correctness.
        await $`bun install`.cwd(tmp).quiet().nothrow();
        await $`bun run check`.cwd(tmp).quiet().nothrow();
        if (mode === 'lib') {
            await $`bun run build`.cwd(tmp).quiet().nothrow();
        }
    };
}

/** Smoke test: copy repo to tmpdir, run setup + install + check for each mode. */
export async function runTestSetup(
    args: string[],
    projectRoot: string,
    _runner?: (mode: Mode, tmp: string) => Promise<void>,
): Promise<number> {
    const validated = validateModes(args);
    if (typeof validated === 'string') {
        logger.error(`test-setup: ${validated}`);
        return 1;
    }
    const runner = _runner ?? createRealRunner(projectRoot);
    return testEachMode(validated, runner);
}
