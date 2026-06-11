import { mkdir, realpath } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';

export function resolveInside(base: string, input: string): string {
    const resolvedBase = resolve(base);
    const resolvedInput = isAbsolute(input) ? resolve(input) : resolve(resolvedBase, input);
    const rel = relative(resolvedBase, resolvedInput);

    if (rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))) {
        return resolvedInput;
    }

    throw new Error(`Path escapes base directory: ${input}`);
}

export function toPosixPath(path: string): string {
    return path.split(sep).join('/');
}

export function destinationFor(targetRoot: string, type: string, name: string): string {
    if (type === 'skill') {
        return join(targetRoot, '.claude', 'skills', name, 'SKILL.md');
    }
    if (type === 'command') {
        return join(targetRoot, '.claude', 'commands', `${name}.md`);
    }
    if (type === 'config') {
        return join(targetRoot, '.claude', 'imported-configs', `${name}.md`);
    }
    return join(targetRoot, 'docs', 'reviews', 'ts-libs-candidates', `${name}.md`);
}

export function candidateId(type: string, relativeSourcePath: string): string {
    return `${type}:${toPosixPath(relativeSourcePath)
        .replace(/[^a-zA-Z0-9._/-]/g, '-')
        .replaceAll('/', ':')}`;
}

export async function ensureParentDirectory(path: string): Promise<void> {
    await mkdir(resolve(path, '..'), { recursive: true });
}

export async function isSymlinkInside(sourceRoot: string, path: string): Promise<boolean> {
    const [realSource, realTarget] = await Promise.all([realpath(sourceRoot), realpath(path)]);
    const rel = relative(realSource, realTarget);
    return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}
