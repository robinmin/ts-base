#!/usr/bin/env bun
// Wipes scratch state from the scaffolds. Useful when someone accidentally
// runs `bun install` inside src-cli/ or src-monorepo/, or when the .turbo
// caches grow stale.
import { access, rm } from 'node:fs/promises';
import { logger } from './lib/logger';

const ROOT = new URL('..', import.meta.url).pathname;

const TARGETS = [
    'src-cli/node_modules',
    'src-cli/.turbo',
    'src-cli/bun.lock',
    'src-monorepo/node_modules',
    'src-monorepo/.turbo',
    'src-monorepo/bun.lock',
    '.coverage',
    '.turbo',
    'dist',
];

async function exists(path: string): Promise<boolean> {
    try {
        await access(path);
        return true;
    } catch {
        return false;
    }
}

let removed = 0;
for (const target of TARGETS) {
    const path = `${ROOT}/${target}`;
    if (await exists(path)) {
        await rm(path, { recursive: true, force: true });
        logger.info(`  removed ${target}`);
        removed += 1;
    }
}
logger.info(removed === 0 ? 'nothing to clean.' : `cleaned ${removed} path(s).`);
