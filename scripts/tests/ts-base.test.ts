import { afterEach, describe, expect, it } from 'bun:test';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runCli } from '../ts-base';

const tmpRoots: string[] = [];

async function tempRoot(): Promise<string> {
    const root = await mkdtemp(join(tmpdir(), 'ts-base-cli-'));
    tmpRoots.push(root);
    return root;
}

async function write(path: string, content: string): Promise<void> {
    await mkdir(join(path, '..'), { recursive: true });
    await writeFile(path, content);
}

afterEach(async () => {
    await Promise.all(tmpRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('ts-base CLI', () => {
    it('routes converge scan, review, and apply through one entrypoint', async () => {
        const root = await tempRoot();
        const source = join(root, 'source');
        const previousCwd = process.cwd();
        const output: string[] = [];
        const errors: string[] = [];
        await write(join(source, '.claude/skills/example/SKILL.md'), '# Example\n\nReusable.\n');

        try {
            process.chdir(root);
            const scanCode = await runCli(
                ['converge', 'scan', '--from', source, '--mode', 'app', '--type', 'skills', '--review-id', 'review'],
                {
                    stdout: (text) => output.push(text),
                    stderr: (text) => errors.push(text),
                },
            );
            const reviewPath = join(root, 'docs/reviews/review.json');
            const reviewCode = await runCli(['converge', 'review', '--review', reviewPath], {
                stdout: (text) => output.push(text),
                stderr: (text) => errors.push(text),
            });
            const review = JSON.parse(await readFile(reviewPath, 'utf8')) as { candidates: Array<{ id: string }> };
            const applyCode = await runCli(
                ['converge', 'apply', '--review', reviewPath, '--approve', review.candidates[0]?.id ?? ''],
                {
                    stdout: (text) => output.push(text),
                    stderr: (text) => errors.push(text),
                },
            );

            expect(scanCode).toBe(0);
            expect(reviewCode).toBe(0);
            expect(applyCode).toBe(0);
            expect(errors).toEqual([]);
            expect(output.join('\n')).toContain('Review written');
            expect(output.join('\n')).toContain('Applied: 1');
            expect(await readFile(join(root, '.claude/skills/example/SKILL.md'), 'utf8')).toContain('# Example');
        } finally {
            process.chdir(previousCwd);
        }
    });

    it('validates command shape and required options', async () => {
        const output: string[] = [];
        const errors: string[] = [];
        const io = {
            stdout: (text: string) => output.push(text),
            stderr: (text: string) => errors.push(text),
        };

        expect(await runCli(['unknown'], io)).toBe(1);
        expect(await runCli(['converge', 'unknown'], io)).toBe(1);
        expect(errors.join('\n')).toContain('Usage:');
        await expect(runCli(['converge', 'scan', '--from', '.'], io)).rejects.toThrow('Missing required option --mode');
        await expect(runCli(['converge', 'scan', '--from', '.', '--mode', 'bad'], io)).rejects.toThrow('Invalid mode');
        await expect(runCli(['converge', 'scan', '--from', '.', '--mode', 'app', '--type', 'bad'], io)).rejects.toThrow(
            'Invalid type',
        );
        await expect(runCli(['converge', 'apply', '--review', 'missing.json'], io)).rejects.toThrow(
            'Missing required option --approve',
        );
        expect(output).toEqual([]);
    });

    it('defaults scan options and returns 2 when apply approval is blocked', async () => {
        const root = await tempRoot();
        const source = join(root, 'source');
        const previousCwd = process.cwd();
        const output: string[] = [];
        const errors: string[] = [];
        await write(join(source, 'AGENTS.md'), '# Source\n\nAWS deployment for gobing-ai.\n');

        try {
            process.chdir(root);
            const scanCode = await runCli(['converge', 'scan', `--from=${source}`, '--mode', 'app'], {
                stdout: (text) => output.push(text),
                stderr: (text) => errors.push(text),
            });
            const reviewPath = join(root, 'docs/reviews');
            const reviewFile = (await Array.fromAsync(new Bun.Glob('*.json').scan({ cwd: reviewPath })))[0];
            const review = JSON.parse(await readFile(join(reviewPath, reviewFile ?? ''), 'utf8')) as {
                candidates: Array<{ id: string }>;
            };
            const applyCode = await runCli(
                [
                    'converge',
                    'apply',
                    '--review',
                    join(reviewPath, reviewFile ?? ''),
                    '--approve',
                    review.candidates[0]?.id ?? '',
                ],
                {
                    stdout: (text) => output.push(text),
                    stderr: (text) => errors.push(text),
                },
            );

            expect(scanCode).toBe(0);
            expect(applyCode).toBe(2);
            expect(errors).toEqual([]);
            expect(output.join('\n')).toContain('Blocked: 1');
        } finally {
            process.chdir(previousCwd);
        }
    });

    it('rejects apply when the review targetRoot is not the current project root', async () => {
        const root = await tempRoot();
        const reviewPath = join(root, 'review.json');
        const previousCwd = process.cwd();
        await write(
            reviewPath,
            JSON.stringify({
                sourceProject: root,
                targetRoot: join(root, 'elsewhere'),
                targetMode: 'app',
                createdAt: '2026-06-10T00:00:00.000Z',
                candidates: [],
                proposedChanges: [],
                blocked: [],
            }),
        );

        try {
            process.chdir(root);
            await expect(
                runCli(['converge', 'apply', '--review', reviewPath, '--approve', 'any'], {
                    stdout: () => {},
                    stderr: () => {},
                }),
            ).rejects.toThrow('does not match the current project root');
        } finally {
            process.chdir(previousCwd);
        }
    });

    it('supports default stdout and stderr handlers', async () => {
        const root = await tempRoot();
        const reviewPath = join(root, 'review.json');
        await write(
            reviewPath,
            JSON.stringify({
                sourceProject: root,
                targetRoot: root,
                targetMode: 'app',
                createdAt: '2026-06-10T00:00:00.000Z',
                candidates: [],
                proposedChanges: [],
                blocked: [],
            }),
        );

        const origWrite = Bun.write;
        // biome-ignore lint/suspicious/noExplicitAny: suppressing test output via Bun.write override
        Bun.write = (() => Promise.resolve(0)) as any;
        try {
            expect(await runCli(['unknown'])).toBe(1);
            expect(await runCli(['converge', 'review', '--review', reviewPath])).toBe(0);
        } finally {
            Bun.write = origWrite;
        }
    });

    it('routes unknown top-level command', async () => {
        const output: string[] = [];
        const errors: string[] = [];
        const code = await runCli(['bogus'], {
            stdout: (text) => output.push(text),
            stderr: (text) => errors.push(text),
        });
        expect(code).toBe(1);
        expect(errors.join('\n')).toContain('Usage:');
        expect(errors.join('\n')).toContain('setup');
        expect(errors.join('\n')).toContain('clean');
        expect(errors.join('\n')).toContain('test-setup');
        expect(errors.join('\n')).toContain('converge');
    });

    it('handles source project with invalid package.json gracefully', async () => {
        const root = await tempRoot();
        const source = join(root, 'bad-source');
        const previousCwd = process.cwd();
        const output: string[] = [];
        const errors: string[] = [];
        await write(join(source, '.claude/skills/example/SKILL.md'), '# Example\n\nReusable.\n');
        // Invalid JSON in package.json triggers sourceProjectMarkers catch path
        await write(join(source, 'package.json'), 'not-json');

        try {
            process.chdir(root);
            const code = await runCli(['converge', 'scan', '--from', source, '--mode', 'app'], {
                stdout: (text) => output.push(text),
                stderr: (text) => errors.push(text),
            });
            // scan should still succeed — markers are informational
            expect(code).toBe(0);
        } finally {
            process.chdir(previousCwd);
        }
    });
});
