import { mkdir, realpath } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import type { CopyCandidateKind } from './types';

/** Resolve a path and validate it stays inside the given base directory. */
export function resolveInside(base: string, input: string): string {
    const resolvedBase = resolve(base);
    const resolvedInput = isAbsolute(input) ? resolve(input) : resolve(resolvedBase, input);
    const rel = relative(resolvedBase, resolvedInput);

    if (rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))) {
        return resolvedInput;
    }

    throw new Error(`Path escapes base directory: ${input}`);
}

/** Convert a platform-native path to forward-slash form. */
export function toPosixPath(path: string): string {
    return path.split(sep).join('/');
}

/** Compute the canonical destination path for a candidate inside the target project. */
export function destinationFor(targetRoot: string, type: CopyCandidateKind, name: string): string {
    switch (type) {
        case 'skill':
            return join(targetRoot, '.claude', 'skills', name, 'SKILL.md');
        case 'command':
            return join(targetRoot, '.claude', 'commands', `${name}.md`);
        case 'config':
            return join(targetRoot, '.claude', 'imported-configs', `${name}.md`);
    }
}

/** Generate a stable, human-readable identifier for a discovered candidate. */
export function candidateId(type: string, relativeSourcePath: string): string {
    return `${type}:${toPosixPath(relativeSourcePath)
        .replace(/[^a-zA-Z0-9._/-]/g, '-')
        .replaceAll('/', ':')}`;
}

/** Recursively create the parent directory for a file path. */
export async function ensureParentDirectory(path: string): Promise<void> {
    await mkdir(resolve(path, '..'), { recursive: true });
}

/** Check whether a symlink resolves to a path inside the given root. */
export async function isSymlinkInside(sourceRoot: string, path: string): Promise<boolean> {
    const [realSource, realTarget] = await Promise.all([realpath(sourceRoot), realpath(path)]);
    const rel = relative(realSource, realTarget);
    return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}
