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

async function assertNoMatches(tmp: string, pattern: string, globs: string[], message: string): Promise<void> {
    const args = ['rg', '-n', pattern, tmp, ...globs.flatMap((glob) => ['-g', glob])];
    const result = await $`${args}`.quiet().nothrow();
    if (result.exitCode === 0) {
        throw new Error(`${message}:\n${result.text()}`);
    }
    if (result.exitCode !== 1) {
        throw new Error(`Search failed while checking generated project: ${result.stderr.toString()}`);
    }
}

async function runGeneratedGate(label: string, command: () => Promise<unknown>): Promise<void> {
    try {
        await command();
    } catch (error) {
        const output =
            error && typeof error === 'object'
                ? `${'stdout' in error ? String(error.stdout) : ''}${'stderr' in error ? String(error.stderr) : ''}`
                : '';
        throw new Error(`${label} failed${output.trim() ? `:\n${output.trim()}` : ''}`, { cause: error });
    }
}

/** Verify a freshly promoted monorepo through the complete generated-project gate. */
export async function verifyPromotedMonorepo(tmp: string): Promise<void> {
    await assertNoMatches(
        tmp,
        '@SCOPE/',
        ['*.json', '*.ts', '*.tsx', '!node_modules/**', '!.git/**'],
        'Scope rewriting failed: @SCOPE/ placeholder remains',
    );
    await assertNoMatches(
        tmp,
        '(?i)turbo(repo)?',
        ['package.json', '*.ts', '*.json', '!docs/**', '!node_modules/**', '!.git/**'],
        'Turbo reference remains in generated monorepo',
    );
    await runGeneratedGate('frozen install', () => $`bun install --frozen-lockfile`.cwd(tmp).quiet());
    await runGeneratedGate('lint', () => $`bun run lint`.cwd(tmp).quiet());
    await runGeneratedGate('typecheck', () => $`bun run typecheck`.cwd(tmp).quiet());
    await runGeneratedGate('test', () => $`bun run test`.cwd(tmp).quiet());
    await runGeneratedGate('build', () => $`bun run build`.cwd(tmp).quiet());
    const gitStatus = await $`git status --porcelain`.cwd(tmp).quiet();
    if (gitStatus.text().trim() !== '') {
        throw new Error(`Generated monorepo has dirty git status after promotion:\n${gitStatus.text()}`);
    }
}

/**
 * Create the real smoke-test runner that rsyncs the repo, runs setup, installs,
 * and checks. Exported so tests can verify the shell commands are formed correctly.
 */
export function createRealRunner(projectRoot: string): (mode: Mode, tmp: string) => Promise<void> {
    return async (mode, tmp) => {
        await $`rsync -a --exclude node_modules --exclude .git --exclude .coverage --exclude dist ${projectRoot}/ ${tmp}/`.quiet();
        await $`git init -q`.cwd(tmp).quiet();
        await runSetupDirect(mode, { noDb: false, noConfig: false }, tmp);
        // Scope replacement can change import sort order. Normalize only after
        // dependencies are available, then snapshot the generated baseline.
        await runGeneratedGate('bootstrap frozen install', () => $`bun install --frozen-lockfile`.cwd(tmp).quiet());
        await runGeneratedGate('post-scope format', () => $`bun run format`.cwd(tmp).quiet());
        await $`git add -A`.cwd(tmp).quiet();
        await $`git -c user.name=ts-base -c user.email=ts-base@example.invalid commit -q -m "chore: snapshot generated baseline"`
            .cwd(tmp)
            .quiet();
        if (mode === 'mono') {
            await verifyPromotedMonorepo(tmp);
            return;
        }
        await $`bun run lint`.cwd(tmp).quiet();
        await $`bun run typecheck`.cwd(tmp).quiet();
        await $`bun run test`.cwd(tmp).quiet();
        if (mode === 'lib' || mode === 'cli') {
            await $`bun run build`.cwd(tmp).quiet();
        }
        const gitStatus = await $`git status --porcelain`.cwd(tmp).quiet();
        if (gitStatus.text().trim() !== '') {
            throw new Error(`Generated ${mode} project is dirty after verification:\n${gitStatus.text()}`);
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
