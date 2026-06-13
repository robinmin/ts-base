#!/usr/bin/env bun
/**
 * Smoke test for setup.ts. Copies the repo into a tmp dir, runs `bun run setup`
 * for the chosen mode(s), then runs `bun install && bun run check` to confirm
 * the promoted project is internally consistent.
 *
 * Usage:
 *   bun run scripts/test-setup.ts             # all four modes
 *   bun run scripts/test-setup.ts app lib     # subset
 *
 * Runs the modes sequentially to keep output legible. Each mode takes
 * roughly 30-60s end-to-end (one `bun install` per copy), so the full
 * suite is ~3 minutes; this is a CI-grade harness, not a pre-commit hook.
 */
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { $ } from 'bun';
import { logger } from './lib/logger';

const ROOT = new URL('..', import.meta.url).pathname;
const ALL_MODES = ['app', 'lib', 'cli', 'mono'] as const;
type Mode = (typeof ALL_MODES)[number];

const argv = process.argv.slice(2);
const requested = argv.length > 0 ? (argv as Mode[]) : ALL_MODES;
for (const m of requested) {
    if (!(ALL_MODES as readonly string[]).includes(m)) {
        logger.error(`test-setup: unknown mode "${m}" (expected: ${ALL_MODES.join(', ')})`);
        process.exit(1);
    }
}

let failed = 0;
for (const mode of requested) {
    const label = `[${mode}]`;
    const tmp = await mkdtemp(join(tmpdir(), `ts-base-${mode}-`));
    logger.info(`${label} workspace: ${tmp}`);
    try {
        // Copy the template (excluding artifacts that would shadow the fresh install).
        await $`rsync -a --exclude node_modules --exclude .git --exclude .turbo --exclude .coverage --exclude dist ${ROOT}/ ${tmp}/`.quiet();
        // lefthook install (run during the `prepare` hook of `bun install`)
        // requires a git repo. Init a throwaway one.
        await $`git init -q`.cwd(tmp);

        // Promote, install, verify.
        await $`bun run setup --mode=${mode}`.cwd(tmp);
        await $`bun install`.cwd(tmp);
        await $`bun run check`.cwd(tmp);
        if (mode === 'lib') {
            await $`bun run build`.cwd(tmp);
        }

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
    process.exit(1);
}
logger.info(`\nAll ${requested.length} mode(s) passed.`);
