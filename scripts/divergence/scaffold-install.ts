import { mkdir, readdir, symlink } from 'node:fs/promises';
import { join } from 'node:path';
import { $ } from 'bun';
import { logger } from '../lib/logger';

const SCAFFOLDS = [
    { dir: 'src-cli', packages: ['utils'] },
    { dir: 'src-monorepo', packages: ['api', 'config', 'db', 'utils'] },
];

/** Install deps and create @SCOPE/* workspace symlinks in scaffold dirs. */
export async function runScaffoldInstall(projectRoot: string): Promise<void> {
    for (const scaffold of SCAFFOLDS) {
        logger.info(`installing ${scaffold.dir} workspace deps…`);
        await $`bun install --silent`.cwd(`${projectRoot}/${scaffold.dir}`).nothrow();

        // Create @SCOPE/* → ../../packages/* symlinks. bun install should do this,
        // but some Bun versions treat @SCOPE as a literal scope and skip.
        const scopeDir = join(projectRoot, scaffold.dir, 'node_modules', '@SCOPE');
        await mkdir(scopeDir, { recursive: true });
        for (const pkg of scaffold.packages) {
            const link = join(scopeDir, pkg);
            const target = join('..', '..', 'packages', pkg);
            let existing: string[] | null = null;
            try {
                existing = await readdir(link);
            } catch {
                // Link doesn't exist or is broken — create it.
            }
            if (existing) continue; // real dir — don't clobber
            try {
                await symlink(target, link);
            } catch {
                // Ignore EEXIST if the link already points to the right place.
            }
        }
    }
}
