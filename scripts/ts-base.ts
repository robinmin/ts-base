#!/usr/bin/env bun
import { resolve } from 'node:path';
import { applyApprovedCandidates } from './agent-convergence/apply';
import { classifyCandidates } from './agent-convergence/classify';
import { discoverCandidates } from './agent-convergence/discovery';
import { createReview, readReview, renderReview, writeReviewArtifacts } from './agent-convergence/review';
import type { CandidateTypeFilter, Mode } from './agent-convergence/types';
import { runClean } from './divergence/clean';
import { runScaffoldInstall } from './divergence/scaffold-install';
import { runSetup } from './divergence/setup';
import { runTestSetup } from './divergence/test-setup';

interface CliIO {
    stdout: (text: string) => void;
    stderr: (text: string) => void;
}

const MODES = new Set<Mode>(['app', 'lib', 'cli', 'mono']);
const TYPE_FILTERS = new Set<CandidateTypeFilter>([
    'skill',
    'command',
    'config',
    'code',
    'skills',
    'commands',
    'configs',
    'all',
]);

function readOption(args: string[], name: string): string | undefined {
    const prefix = `${name}=`;
    const inline = args.find((arg) => arg.startsWith(prefix));
    if (inline) {
        return inline.slice(prefix.length);
    }
    const index = args.indexOf(name);
    return index >= 0 ? args[index + 1] : undefined;
}

function readOptions(args: string[], name: string): string[] {
    const values: string[] = [];
    const prefix = `${name}=`;
    for (let index = 0; index < args.length; index += 1) {
        const arg = args[index];
        if (arg?.startsWith(prefix)) {
            values.push(arg.slice(prefix.length));
        } else if (arg === name) {
            const value = args[index + 1];
            if (!value || value.startsWith('--')) {
                throw new Error(`Missing value for option ${name}`);
            }
            values.push(value);
            index += 1;
        }
    }
    return values;
}

function positiveIntegerOption(args: string[], name: string, fallback: number): number {
    const raw = readOption(args, name);
    if (!raw) return fallback;
    const value = Number(raw);
    if (!Number.isSafeInteger(value) || value <= 0) {
        throw new Error(`${name} must be a positive integer`);
    }
    return value;
}

function requireOption(args: string[], name: string): string {
    const value = readOption(args, name);
    if (!value) {
        throw new Error(`Missing required option ${name}`);
    }
    return value;
}

function parseMode(value: string): Mode {
    if (MODES.has(value as Mode)) {
        return value as Mode;
    }
    throw new Error(`Invalid mode "${value}" (expected app, lib, cli, or mono)`);
}

function parseTypeFilter(value: string | undefined): CandidateTypeFilter {
    if (!value) {
        return 'all';
    }
    if (TYPE_FILTERS.has(value as CandidateTypeFilter)) {
        return value as CandidateTypeFilter;
    }
    throw new Error(`Invalid type "${value}" (expected skills, commands, configs, code, or all)`);
}

function reviewId(): string {
    return `agent-convergence-${new Date().toISOString().replace(/[:.]/g, '-')}`;
}

async function sourceProjectMarkers(sourceProject: string): Promise<string[]> {
    const pkgFile = Bun.file(resolve(sourceProject, 'package.json'));
    if (!(await pkgFile.exists())) {
        return [];
    }
    try {
        const pkg = (await pkgFile.json()) as { name?: unknown };
        return typeof pkg.name === 'string' && pkg.name.length > 0 ? [pkg.name] : [];
    } catch {
        return [];
    }
}

async function scan(args: string[], io: CliIO): Promise<number> {
    const targetRoot = process.cwd();
    const sourceProject = resolve(targetRoot, requireOption(args, '--from'));
    const targetMode = parseMode(requireOption(args, '--mode'));
    const typeFilter = parseTypeFilter(readOption(args, '--type'));
    const codeRoots = readOptions(args, '--code-root');
    if (typeFilter === 'code' && codeRoots.length === 0) {
        throw new Error('--type code requires at least one --code-root <relative-path>');
    }
    const reviewDir = resolve(targetRoot, readOption(args, '--review-dir') ?? 'docs/reviews');
    const id = readOption(args, '--review-id') ?? reviewId();
    const options = {
        sourceProject,
        targetRoot,
        targetMode,
        typeFilter,
        ...(codeRoots.length > 0
            ? {
                  code: {
                      roots: codeRoots,
                      maxFileBytes: positiveIntegerOption(args, '--code-max-bytes', 262_144),
                      maxCandidates: positiveIntegerOption(args, '--code-max-candidates', 500),
                  },
              }
            : {}),
    };
    const raw = await discoverCandidates(options);
    const candidates = classifyCandidates(raw, { projectMarkers: await sourceProjectMarkers(sourceProject) });
    const review = await createReview(options, candidates);
    const written = await writeReviewArtifacts(review, reviewDir, id);

    io.stdout(`Review written:\n${written.jsonPath}\n${written.markdownPath}\n`);
    return 0;
}

async function summarize(args: string[], io: CliIO): Promise<number> {
    const reviewPath = resolve(process.cwd(), requireOption(args, '--review'));
    const review = await readReview(reviewPath);
    io.stdout(renderReview(review));
    return 0;
}

async function apply(args: string[], io: CliIO): Promise<number> {
    const reviewPath = resolve(process.cwd(), requireOption(args, '--review'));
    const approved = requireOption(args, '--approve')
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);
    const review = await readReview(reviewPath);
    const projectRoot = resolve(process.cwd());
    if (resolve(review.targetRoot) !== projectRoot) {
        throw new Error(
            `Review targetRoot "${review.targetRoot}" does not match the current project root "${projectRoot}"; rerun scan from this project.`,
        );
    }
    const result = await applyApprovedCandidates(review, approved);
    io.stdout(
        [
            `Applied: ${result.applied.length}`,
            `Skipped: ${result.skipped.length}`,
            `Blocked: ${result.blocked.length}`,
            '',
        ].join('\n'),
    );
    return result.blocked.length > 0 ? 2 : 0;
}

function usage(): string {
    return [
        'Usage:',
        '  bun run scripts/ts-base.ts setup [--mode <app|lib|cli|mono>] [--no-db] [--no-config]',
        '  bun run scripts/ts-base.ts clean',
        '  bun run scripts/ts-base.ts test-setup [app|lib|cli|mono ...]',
        '  bun run scripts/ts-base.ts ensure-scaffold-installs',
        '  bun run scripts/ts-base.ts converge scan --from <path> --mode <app|lib|cli|mono>',
        '      [--type <all|skills|commands|configs|code>] [--review-dir <dir>] [--review-id <id>]',
        '      [--code-root <relative-path> ...] [--code-max-bytes <n>] [--code-max-candidates <n>]',
        '      code is review-only and never applied; --type code requires --code-root',
        '  bun run scripts/ts-base.ts converge review --review <review.json>',
        '  bun run scripts/ts-base.ts converge apply --review <review.json> --approve <candidate-id[,candidate-id]>',
        '',
    ].join('\n');
}

const PROJECT_ROOT = resolve(import.meta.dir, '..');

/** Entry point for the ts-base CLI. Routes all subcommands. */
export async function runCli(
    args: string[],
    io: CliIO = {
        stdout: (text) => {
            Bun.write(Bun.stdout, text);
        },
        stderr: (text) => {
            Bun.write(Bun.stderr, text);
        },
    },
): Promise<number> {
    const [command, ...rest] = args;

    if (command === 'setup') {
        return runSetup(rest, PROJECT_ROOT);
    }
    if (command === 'clean') {
        return runClean(PROJECT_ROOT);
    }
    if (command === 'test-setup') {
        return runTestSetup(rest, PROJECT_ROOT);
    }
    if (command === 'ensure-scaffold-installs') {
        await runScaffoldInstall(PROJECT_ROOT);
        return 0;
    }

    if (command === 'converge') {
        const [subcommand, ...subRest] = rest;
        if (subcommand === 'scan') {
            return scan(subRest, io);
        }
        if (subcommand === 'review') {
            return summarize(subRest, io);
        }
        if (subcommand === 'apply') {
            return apply(subRest, io);
        }
    }

    io.stderr(usage());
    return 1;
}

if (import.meta.main) {
    try {
        const code = await runCli(process.argv.slice(2));
        process.exit(code);
    } catch (error) {
        Bun.write(Bun.stderr, `${error instanceof Error ? error.message : String(error)}\n`);
        process.exit(1);
    }
}
