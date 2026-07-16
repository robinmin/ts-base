import { lstat, readdir, stat } from 'node:fs/promises';
import { basename, extname, isAbsolute, join, relative } from 'node:path';
import { Glob } from 'bun';
import { candidateId, destinationFor, isSymlinkInside, resolveInside, toPosixPath } from './paths';
import type {
    CandidateKind,
    CodeDiscoveryOptions,
    ConvergenceScanOptions,
    CopyCandidateKind,
    RawCandidate,
} from './types';

const CONFIG_FILES = ['AGENTS.md', 'CLAUDE.md', 'GEMINI.md'];

function includesType(filter: string, type: CandidateKind): boolean {
    if (filter === 'all') {
        return true;
    }
    if (filter === 'configs') {
        return type === 'config';
    }
    if (filter === 'skills') {
        return type === 'skill';
    }
    if (filter === 'commands') {
        return type === 'command';
    }
    return filter === type;
}

async function exists(path: string): Promise<boolean> {
    try {
        await lstat(path);
        return true;
    } catch {
        return false;
    }
}

async function safeReadText(path: string): Promise<string> {
    return Bun.file(path).text();
}

async function resolvesInsideSource(sourceProject: string, path: string): Promise<boolean> {
    try {
        return await isSymlinkInside(sourceProject, path);
    } catch {
        return false;
    }
}

async function addCandidate(
    candidates: RawCandidate[],
    options: ConvergenceScanOptions,
    type: CopyCandidateKind,
    sourcePath: string,
    name: string,
    content?: string,
): Promise<void> {
    const relativeSourcePath = toPosixPath(relative(options.sourceProject, sourcePath));
    candidates.push({
        id: candidateId(type, relativeSourcePath),
        type,
        sourcePath,
        relativeSourcePath,
        destinationPath: destinationFor(options.targetRoot, type, name),
        content: content ?? (await safeReadText(sourcePath)),
    });
}

async function discoverSkills(options: ConvergenceScanOptions, candidates: RawCandidate[]): Promise<void> {
    if (!includesType(options.typeFilter, 'skill')) {
        return;
    }

    const roots = ['.claude/skills', '.agents/skills'];
    const seen = new Set<string>();

    for (const root of roots) {
        const skillRoot = join(options.sourceProject, root);
        if (!(await exists(skillRoot))) {
            continue;
        }
        for (const entry of await readdir(skillRoot)) {
            const skillFile = join(skillRoot, entry, 'SKILL.md');
            if (!(await exists(skillFile))) {
                continue;
            }
            if (!(await resolvesInsideSource(options.sourceProject, skillFile))) {
                continue;
            }
            const content = await safeReadText(skillFile);
            const key = `${entry}:${content}`;
            if (seen.has(key)) {
                continue;
            }
            seen.add(key);
            await addCandidate(candidates, options, 'skill', skillFile, entry, content);
        }
    }
}

async function discoverCommands(options: ConvergenceScanOptions, candidates: RawCandidate[]): Promise<void> {
    if (!includesType(options.typeFilter, 'command')) {
        return;
    }

    const commandRoot = join(options.sourceProject, '.claude', 'commands');
    if (!(await exists(commandRoot))) {
        return;
    }

    for (const entry of await readdir(commandRoot)) {
        if (extname(entry) !== '.md') {
            continue;
        }
        const commandFile = join(commandRoot, entry);
        if (!(await resolvesInsideSource(options.sourceProject, commandFile))) {
            continue;
        }
        await addCandidate(candidates, options, 'command', commandFile, basename(entry, '.md'));
    }
}

async function discoverConfigs(options: ConvergenceScanOptions, candidates: RawCandidate[]): Promise<void> {
    if (!includesType(options.typeFilter, 'config')) {
        return;
    }

    for (const file of CONFIG_FILES) {
        const path = join(options.sourceProject, file);
        if ((await exists(path)) && (await resolvesInsideSource(options.sourceProject, path))) {
            await addCandidate(candidates, options, 'config', path, file.replaceAll('.', '-'));
        }
    }

    const codexRoot = join(options.sourceProject, '.codex');
    if (!(await exists(codexRoot))) {
        return;
    }

    for await (const relativePath of new Glob('**/*').scan({ cwd: codexRoot, onlyFiles: true })) {
        const path = join(codexRoot, relativePath);
        if (!(await resolvesInsideSource(options.sourceProject, path))) {
            continue;
        }
        await addCandidate(
            candidates,
            options,
            'config',
            path,
            `codex-${toPosixPath(relativePath).replaceAll('/', '-')}`,
        );
    }
}

// ── Review-only code discovery ────────────────────────────────────

const CODE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const CODE_EXCLUDE = [
    new Glob('**/node_modules/**'),
    new Glob('**/.git/**'),
    new Glob('**/dist/**'),
    new Glob('**/build/**'),
    new Glob('**/.coverage/**'),
    new Glob('**/coverage/**'),
    new Glob('**/tests/**'),
    new Glob('**/__tests__/**'),
    new Glob('**/*.test.*'),
    new Glob('**/*.spec.*'),
    new Glob('**/*.d.ts'),
    new Glob('**/*.map'),
];

function isSupportedCodePath(relativePath: string): boolean {
    return CODE_EXTENSIONS.has(extname(relativePath)) && !CODE_EXCLUDE.some((pattern) => pattern.match(relativePath));
}

/** Discover bounded code metadata for review; these candidates can never be applied. */
export async function discoverCode(
    options: ConvergenceScanOptions & { code: CodeDiscoveryOptions },
): Promise<RawCandidate[]> {
    const sourceProject = options.sourceProject;
    const paths = new Set<string>();

    for (const configuredRoot of options.code.roots) {
        if (isAbsolute(configuredRoot)) {
            throw new Error(`Code root must be relative to the source project: ${configuredRoot}`);
        }
        const root = resolveInside(sourceProject, configuredRoot);
        if (!(await exists(root))) {
            throw new Error(`Code root does not exist in source project: ${configuredRoot}`);
        }
        if (!(await resolvesInsideSource(sourceProject, root))) {
            throw new Error(`Code root resolves outside the source project: ${configuredRoot}`);
        }

        for await (const rootRelativePath of new Glob('**/*').scan({ cwd: root, onlyFiles: true })) {
            const sourcePath = join(root, rootRelativePath);
            const relativeSourcePath = toPosixPath(relative(sourceProject, sourcePath));
            if (!isSupportedCodePath(relativeSourcePath)) {
                continue;
            }
            if (!(await resolvesInsideSource(sourceProject, sourcePath))) {
                continue;
            }
            if ((await stat(sourcePath)).size > options.code.maxFileBytes) {
                continue;
            }
            paths.add(sourcePath);
        }
    }

    const selected = [...paths]
        .sort((left, right) =>
            toPosixPath(relative(sourceProject, left)).localeCompare(toPosixPath(relative(sourceProject, right))),
        )
        .slice(0, options.code.maxCandidates);

    return Promise.all(
        selected.map(async (sourcePath) => {
            const bytes = new Uint8Array(await Bun.file(sourcePath).arrayBuffer());
            const content = new TextDecoder().decode(bytes);
            const relativeSourcePath = toPosixPath(relative(sourceProject, sourcePath));
            return {
                id: candidateId('code', relativeSourcePath),
                type: 'code' as const,
                sourcePath,
                relativeSourcePath,
                destinationPath: null,
                content,
                sourceDigest: new Bun.CryptoHasher('sha256').update(bytes).digest('hex'),
            };
        }),
    );
}

/** Scan a source project for importable skills, commands, configs, and review-only code. */
export async function discoverCandidates(options: ConvergenceScanOptions): Promise<RawCandidate[]> {
    const sourceProject = options.sourceProject;
    const normalizedOptions = { ...options, sourceProject };
    const candidates: RawCandidate[] = [];

    await discoverSkills(normalizedOptions, candidates);
    await discoverCommands(normalizedOptions, candidates);
    await discoverConfigs(normalizedOptions, candidates);
    if (includesType(options.typeFilter, 'code') && options.code) {
        candidates.push(...(await discoverCode({ ...normalizedOptions, code: options.code })));
    }

    return candidates;
}
