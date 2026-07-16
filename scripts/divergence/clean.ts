import { access, rm } from 'node:fs/promises';
import { logger } from '../lib/logger';

const TARGETS = [
    'src-cli/node_modules',
    'src-cli/bun.lock',
    'src-monorepo/node_modules',
    'src-monorepo/bun.lock',
    '.coverage',
    'dist',
];

/** Wipe scratch state from scaffolds and the repo root. */
export async function runClean(projectRoot: string): Promise<number> {
    let removed = 0;
    for (const target of TARGETS) {
        const path = `${projectRoot}/${target}`;
        try {
            await access(path);
        } catch {
            continue;
        }
        await rm(path, { recursive: true, force: true });
        logger.info(`  removed ${target}`);
        removed += 1;
    }
    logger.info(removed === 0 ? 'nothing to clean.' : `cleaned ${removed} path(s).`);
    return 0;
}
