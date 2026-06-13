#!/usr/bin/env bun
// Ensures the workspace scaffolds (src-cli, src-monorepo) have their
// dependencies installed and @SCOPE/* workspace symlinks in place so
// template-level `bun test` can resolve the scoped aliases.
import { mkdir, readdir, symlink } from 'node:fs/promises';
import { join } from 'node:path';
import { $ } from 'bun';
import { logger } from './lib/logger';

const ROOT = new URL('..', import.meta.url).pathname;
const SCAFFOLDS = [
    { dir: 'src-cli', packages: ['utils'] },
    { dir: 'src-monorepo', packages: ['api', 'config', 'db', 'utils'] },
];

for (const scaffold of SCAFFOLDS) {
    logger.info(`installing ${scaffold.dir} workspace deps…`);
    await $`bun install --silent`.cwd(`${ROOT}/${scaffold.dir}`).nothrow();

    // Create @SCOPE/* → ../../packages/* symlinks. bun install should do this,
    // but some Bun versions treat @SCOPE as a literal scope and skip.
    const scopeDir = join(ROOT, scaffold.dir, 'node_modules', '@SCOPE');
    await mkdir(scopeDir, { recursive: true });
    for (const pkg of scaffold.packages) {
        const link = join(scopeDir, pkg);
        const target = join('..', '..', 'packages', pkg);
        try {
            const existing = await readdir(link).catch(() => null);
            if (existing) continue; // real dir — don't clobber
        } catch {
            // Link doesn't exist or is broken — create it.
        }
        await symlink(target, link).catch(() => {
            // Ignore EEXIST if the link already points to the right place.
        });
    }
}
