import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const ext = '.js';

for (const entry of ['./dist/index', './dist/browser']) {
    smokeImport('node', ['-e', `const p = ${JSON.stringify(`${entry}${ext}`)}; import(p)`], `${entry}${ext} with Node`);
}

function smokeImport(command: string, args: string[], label: string): void {
    const result = spawnSync(command, args, {
        cwd: repoRoot,
        encoding: 'utf-8',
        stdio: 'pipe',
    });

    if (result.status !== 0) {
        const stderr = result.stderr.trim();
        const stdout = result.stdout.trim();
        throw new Error(`Failed to import built ${label}: ${stderr || stdout || `exit ${result.status}`}`);
    }
}
