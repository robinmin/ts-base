import { lstat, mkdir, readdir, rm, stat, symlink } from 'node:fs/promises';
import { extname, join } from 'node:path';
import type { Mode } from './types';

const ALL_MODES: readonly Mode[] = ['app', 'lib', 'cli', 'mono'];
const SUPPORTED_MODES_LINE = /^supported-modes:\s*\[([^\]]*)\]\s*$/m;

function isMode(value: string): value is Mode {
    return (ALL_MODES as readonly string[]).includes(value);
}

function frontmatterBlock(content: string): string | null {
    if (!content.startsWith('---\n')) {
        return null;
    }
    const end = content.indexOf('\n---', 4);
    return end === -1 ? null : content.slice(4, end);
}

/** Parse the `supported-modes` frontmatter annotation; null means mode-agnostic. */
export function readSupportedModes(content: string): Mode[] | null {
    const block = frontmatterBlock(content);
    const match = block?.match(SUPPORTED_MODES_LINE);
    if (!match?.[1]) {
        return null;
    }
    const modes = match[1]
        .split(',')
        .map((mode) => mode.trim())
        .filter(isMode);
    return modes.length > 0 ? modes : null;
}

/** Persist mode scoping in frontmatter so setup-time pruning can act on applied files. */
export function annotateSupportedModes(content: string, modes: Mode[]): string {
    const line = `supported-modes: [${modes.join(', ')}]`;
    const block = frontmatterBlock(content);
    if (block === null) {
        return `---\n${line}\n---\n\n${content}`;
    }
    const end = content.indexOf('\n---', 4);
    const updatedBlock = SUPPORTED_MODES_LINE.test(block)
        ? block.replace(SUPPORTED_MODES_LINE, line)
        : `${block}\n${line}`;
    return `---\n${updatedBlock}${content.slice(end)}`;
}

async function isDirectory(path: string): Promise<boolean> {
    try {
        return (await stat(path)).isDirectory();
    } catch {
        return false;
    }
}

async function readSupportedModesFromFile(path: string): Promise<Mode[] | null> {
    try {
        return readSupportedModes(await Bun.file(path).text());
    } catch {
        return null;
    }
}

/**
 * Remove canonical capabilities whose `supported-modes` annotation excludes the
 * chosen mode. Unannotated capabilities are mode-agnostic and always kept.
 * Returns the removed paths.
 */
export async function pruneModeScopedCapabilities(projectRoot: string, mode: Mode): Promise<string[]> {
    const removed: string[] = [];

    const skillsRoot = join(projectRoot, '.claude', 'skills');
    if (await isDirectory(skillsRoot)) {
        for (const entry of await readdir(skillsRoot)) {
            const skillDir = join(skillsRoot, entry);
            const modes = await readSupportedModesFromFile(join(skillDir, 'SKILL.md'));
            if (modes && !modes.includes(mode)) {
                await rm(skillDir, { recursive: true, force: true });
                removed.push(skillDir);
            }
        }
    }

    const commandsRoot = join(projectRoot, '.claude', 'commands');
    if (await isDirectory(commandsRoot)) {
        for (const entry of await readdir(commandsRoot)) {
            if (extname(entry) !== '.md') {
                continue;
            }
            const commandFile = join(commandsRoot, entry);
            const modes = await readSupportedModesFromFile(commandFile);
            if (modes && !modes.includes(mode)) {
                await rm(commandFile, { force: true });
                removed.push(commandFile);
            }
        }
    }

    return removed;
}

/**
 * Create or refresh the `.agents/skills -> ../.claude/skills` symlink. Only
 * wires the link when the canonical skills directory exists (never a dangling
 * link), replaces stale symlinks, and refuses to clobber a real file/directory.
 * Returns true when the link is in place.
 */
export async function wireAgentSkillsSymlink(projectRoot: string): Promise<boolean> {
    const skillsRoot = join(projectRoot, '.claude', 'skills');
    if (!(await isDirectory(skillsRoot))) {
        return false;
    }
    const linkPath = join(projectRoot, '.agents', 'skills');
    const existing = await lstat(linkPath).catch(() => null);
    if (existing) {
        if (!existing.isSymbolicLink()) {
            return false;
        }
        await rm(linkPath, { force: true });
    }
    await mkdir(join(projectRoot, '.agents'), { recursive: true });
    await symlink(join('..', '.claude', 'skills'), linkPath);
    return true;
}
