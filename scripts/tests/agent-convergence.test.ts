import { afterEach, describe, expect, it } from 'bun:test';
import { lstat, mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { applyApprovedCandidates } from '../agent-convergence/apply';
import {
    annotateSupportedModes,
    pruneModeScopedCapabilities,
    readSupportedModes,
    wireAgentSkillsSymlink,
} from '../agent-convergence/capabilities';
import { classifyCandidate, classifyCandidates } from '../agent-convergence/classify';
import { discoverCandidates } from '../agent-convergence/discovery';
import { destinationFor, isSymlinkInside, resolveInside } from '../agent-convergence/paths';
import { createReview, readReview, renderReview, writeReviewArtifacts } from '../agent-convergence/review';
import type { CapabilityReview, ConvergenceScanOptions, RawCandidate } from '../agent-convergence/types';

const tmpRoots: string[] = [];

async function tempRoot(): Promise<string> {
    const root = await mkdtemp(join(tmpdir(), 'ts-base-convergence-'));
    tmpRoots.push(root);
    return root;
}

async function write(path: string, content: string): Promise<void> {
    await mkdir(join(path, '..'), { recursive: true });
    await writeFile(path, content);
}

async function fixture(): Promise<{ source: string; target: string; options: ConvergenceScanOptions }> {
    const root = await tempRoot();
    const source = join(root, 'source-project');
    const target = join(root, 'target-project');
    await mkdir(source, { recursive: true });
    await mkdir(target, { recursive: true });
    await write(join(source, '.claude/skills/generic/SKILL.md'), '# Generic Skill\n\nReusable workflow guidance.\n');
    await write(join(source, '.claude/commands/do-work.md'), '# Do Work\n\nMode: cli\n');
    await write(
        join(source, 'AGENTS.md'),
        '# Project Agent Contract\n\nPrivate project path: /Users/robin/xprojects/app\n',
    );

    return {
        source,
        target,
        options: {
            sourceProject: source,
            targetRoot: target,
            targetMode: 'cli',
            typeFilter: 'all',
        },
    };
}

afterEach(async () => {
    await Promise.all(tmpRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('agent convergence discovery', () => {
    it('discovers canonical skills, commands, and config candidates', async () => {
        const { options } = await fixture();
        const candidates = await discoverCandidates(options);

        expect(candidates.map((candidate) => candidate.type).sort()).toEqual(['command', 'config', 'skill']);
        expect(candidates.map((candidate) => candidate.id)).toContain('skill:.claude:skills:generic:SKILL.md');
        expect(candidates.map((candidate) => candidate.id)).toContain('command:.claude:commands:do-work.md');
        expect(candidates.map((candidate) => candidate.id)).toContain('config:AGENTS.md');
    });

    it('honors type filters and discovers codex config files', async () => {
        const { source, options } = await fixture();
        await write(join(source, '.claude/commands/not-markdown.txt'), 'ignored');
        await write(join(source, '.codex/settings.json'), '{"enabled":true}\n');

        const commands = await discoverCandidates({ ...options, typeFilter: 'commands' });
        const configs = await discoverCandidates({ ...options, typeFilter: 'configs' });

        expect(commands.map((candidate) => candidate.type)).toEqual(['command']);
        expect(configs.map((candidate) => candidate.id)).toContain('config:.codex:settings.json');
    });

    it('skips duplicate skills exposed through .agents', async () => {
        const { source, options } = await fixture();
        await mkdir(join(source, '.agents'), { recursive: true });
        await symlink(join(source, '.claude/skills'), join(source, '.agents/skills'));

        const skills = await discoverCandidates({ ...options, typeFilter: 'skills' });

        expect(skills.map((candidate) => candidate.id)).toEqual(['skill:.claude:skills:generic:SKILL.md']);
    });

    it('skips command and config symlinks that escape the source project', async () => {
        const { source, options } = await fixture();
        const root = await tempRoot();
        const externalFile = join(root, 'external.md');
        await write(externalFile, '# External\n\nOutside the source project.\n');
        await symlink(externalFile, join(source, '.claude/commands/escape.md'));
        await symlink(externalFile, join(source, 'GEMINI.md'));

        const candidates = await discoverCandidates(options);
        const ids = candidates.map((candidate) => candidate.id);

        expect(ids).not.toContain('command:.claude:commands:escape.md');
        expect(ids).not.toContain('config:GEMINI.md');
        expect(ids).toContain('command:.claude:commands:do-work.md');
    });
});

describe('agent convergence classification', () => {
    it('classifies generic, mode-specific, project-specific, sensitive, and ts-libs candidates', async () => {
        const { options } = await fixture();
        const candidates = classifyCandidates(await discoverCandidates(options));
        const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]));

        expect(byId.get('skill:.claude:skills:generic:SKILL.md')?.classification).toBe('generic');
        expect(byId.get('command:.claude:commands:do-work.md')?.classification).toBe('mode-specific');
        expect(byId.get('config:AGENTS.md')?.classification).toBe('project-specific');

        const sensitive = classifyCandidate(rawCandidate('config', '.env', 'API_TOKEN="abc123456789xyz"'));
        expect(sensitive.classification).toBe('sensitive');

        const reusableCode = classifyCandidate(
            rawCandidate('code', 'packages/utils/src/index.ts', 'export function createThing() { return 1; }'),
        );
        expect(reusableCode.classification).toBe('ts-libs-candidate');

        const cleanConfig = classifyCandidate(rawCandidate('config', '.codex/settings.json', '{"theme":"dark"}\n'));
        expect(cleanConfig.classification).toBe('unknown');
    });

    it('does not misroute mode-scoped or word-matching skills to ts-libs', () => {
        const libModeSkill = classifyCandidate(
            rawCandidate('skill', '.claude/skills/build/SKILL.md', '# Build\n\nLib mode build steps.\nMode: lib\n'),
        );
        expect(libModeSkill.classification).toBe('mode-specific');
        expect(libModeSkill.supportedModes).toEqual(['lib']);

        const wordySkill = classifyCandidate(
            rawCandidate('skill', '.claude/skills/conventions/SKILL.md', '# Conventions\n\nKeep shared utils small.\n'),
        );
        expect(wordySkill.classification).toBe('generic');

        const codeConfig = classifyCandidate(
            rawCandidate('config', '.codex/helper.ts', 'export function helper() { return 1; }\n'),
        );
        expect(codeConfig.classification).toBe('ts-libs-candidate');
    });

    it('treats mentions of the source project package name as project-specific', () => {
        const candidate = rawCandidate('command', '.claude/commands/build.md', '# Build\n\nRun @acme/tools build.\n');

        expect(classifyCandidate(candidate, { projectMarkers: ['@acme/tools'] }).classification).toBe(
            'project-specific',
        );
        expect(classifyCandidate(candidate).classification).toBe('generic');
    });

    it('flags commands that mutate files outside the project root for manual review', () => {
        const destructive = classifyCandidate(
            rawCandidate('command', '.claude/commands/cleanup.md', '# Cleanup\n\nRun `rm -rf ~/old-builds`.\n'),
        );
        expect(destructive.classification).toBe('unknown');
    });
});

describe('agent convergence review', () => {
    it('creates JSON and markdown review artifacts', async () => {
        const { options, target } = await fixture();
        const review = await createReview(options, classifyCandidates(await discoverCandidates(options)));
        const paths = await writeReviewArtifacts(review, join(target, 'docs/reviews'), 'review-1');
        const loaded = await readReview(paths.jsonPath);
        const markdown = await readFile(paths.markdownPath, 'utf8');

        expect(loaded.candidates.length).toBe(3);
        expect(markdown).toContain('Agent Capability Convergence Review');
        expect(markdown).toContain('## Risks');
        expect(loaded.risks?.length).toBe(1);
        expect(renderReview(review)).toContain('project-specific');
    });

    it('renders risks and open questions for blocked and unknown candidates', async () => {
        const { source, options } = await fixture();
        await write(join(source, '.codex/settings.json'), '{"theme":"dark"}\n');

        const review = await createReview(options, classifyCandidates(await discoverCandidates(options)));
        const markdown = renderReview(review);

        expect(review.risks?.length).toBe(1);
        expect(review.openQuestions?.length).toBe(1);
        expect(markdown).toContain('- Blocked candidate config:AGENTS.md (project-specific).');
        expect(markdown).toContain('requires manual review');
    });

    it('proposes update or skip when the destination already exists', async () => {
        const { options, target } = await fixture();
        await write(join(target, '.claude/skills/generic/SKILL.md'), '# Generic Skill\n\nOlder local copy.\n');
        await write(join(target, '.claude/commands/do-work.md'), '# Do Work\n\nMode: cli\n');

        const review = await createReview(options, classifyCandidates(await discoverCandidates(options)));
        const byId = new Map(review.proposedChanges.map((change) => [change.candidateId, change]));

        expect(byId.get('skill:.claude:skills:generic:SKILL.md')?.action).toBe('update');
        expect(byId.get('command:.claude:commands:do-work.md')?.action).toBe('skip');
    });
});

describe('agent convergence apply', () => {
    it('applies only approved and allowed candidates', async () => {
        const { options, target } = await fixture();
        const review = await createReview(options, classifyCandidates(await discoverCandidates(options)));
        const generic = review.candidates.find((candidate) => candidate.classification === 'generic');
        const blocked = review.candidates.find((candidate) => candidate.classification === 'project-specific');
        if (!generic || !blocked) {
            throw new Error('Expected generic and project-specific candidates in fixture.');
        }

        const result = await applyApprovedCandidates(review, [generic.id, blocked.id]);
        const appliedContent = await readFile(join(target, '.claude/skills/generic/SKILL.md'), 'utf8');

        expect(result.applied).toEqual([generic.id]);
        expect(result.blocked).toEqual([blocked.id]);
        expect(appliedContent).toContain('Generic Skill');
    });

    it('is idempotent for repeated approved writes', async () => {
        const { options, target } = await fixture();
        const review = await createReview(options, classifyCandidates(await discoverCandidates(options)));
        const generic = review.candidates.find((candidate) => candidate.classification === 'generic');
        if (!generic) {
            throw new Error('Expected generic candidate in fixture.');
        }

        await applyApprovedCandidates(review, [generic.id]);
        await applyApprovedCandidates(review, [generic.id]);

        const appliedContent = await readFile(join(target, '.claude/skills/generic/SKILL.md'), 'utf8');
        expect(appliedContent).toBe('# Generic Skill\n\nReusable workflow guidance.\n');
    });

    it('blocks mode-specific candidates when the target mode differs', async () => {
        const { options } = await fixture();
        const appOptions = { ...options, targetMode: 'app' as const };
        const review = await createReview(appOptions, classifyCandidates(await discoverCandidates(appOptions)));
        const cliCommand = review.candidates.find((candidate) => candidate.classification === 'mode-specific');
        if (!cliCommand) {
            throw new Error('Expected mode-specific candidate in fixture.');
        }

        const result = await applyApprovedCandidates(review, [cliCommand.id]);

        expect(result.blocked).toEqual([cliCommand.id]);
        expect(result.applied).toEqual([]);
    });

    it('annotates applied mode-specific files and refreshes the .agents/skills adaptor', async () => {
        const { options, target } = await fixture();
        const review = await createReview(options, classifyCandidates(await discoverCandidates(options)));
        const generic = review.candidates.find((candidate) => candidate.classification === 'generic');
        const cliCommand = review.candidates.find((candidate) => candidate.classification === 'mode-specific');
        if (!generic || !cliCommand) {
            throw new Error('Expected generic and mode-specific candidates in fixture.');
        }

        const result = await applyApprovedCandidates(review, [generic.id, cliCommand.id]);
        const commandContent = await readFile(join(target, '.claude/commands/do-work.md'), 'utf8');
        const linkStat = await lstat(join(target, '.agents/skills'));

        expect(result.applied.sort()).toEqual([cliCommand.id, generic.id].sort());
        expect(commandContent).toContain('supported-modes: [cli]');
        expect(readSupportedModes(commandContent)).toEqual(['cli']);
        expect(linkStat.isSymbolicLink()).toBe(true);
        expect(await realpath(join(target, '.agents/skills'))).toBe(await realpath(join(target, '.claude/skills')));
    });

    it('re-blocks approved candidates whose source content turned sensitive after scan', async () => {
        const { source, options, target } = await fixture();
        const review = await createReview(options, classifyCandidates(await discoverCandidates(options)));
        const generic = review.candidates.find((candidate) => candidate.classification === 'generic');
        if (!generic) {
            throw new Error('Expected generic candidate in fixture.');
        }
        await write(join(source, '.claude/skills/generic/SKILL.md'), 'API_TOKEN="abc123456789xyz"\n');

        const result = await applyApprovedCandidates(review, [generic.id]);

        expect(result.blocked).toEqual([generic.id]);
        expect(await Bun.file(join(target, '.claude/skills/generic/SKILL.md')).exists()).toBe(false);
    });
});

describe('agent convergence paths', () => {
    it('keeps destination paths inside the target root', async () => {
        const root = await tempRoot();

        expect(resolveInside(root, 'docs/reviews/review.json')).toBe(join(root, 'docs/reviews/review.json'));
        expect(() => resolveInside(root, '../outside')).toThrow('Path escapes base directory');
        expect(destinationFor(root, 'code', 'candidate')).toBe(
            join(root, 'docs/reviews/ts-libs-candidates/candidate.md'),
        );
    });

    it('detects whether symlinks resolve inside the source project', async () => {
        const root = await tempRoot();
        const source = join(root, 'source');
        const outside = join(root, 'outside');
        await mkdir(join(source, 'inside'), { recursive: true });
        await mkdir(outside, { recursive: true });
        await symlink(join(source, 'inside'), join(source, 'inside-link'));
        await symlink(outside, join(source, 'outside-link'));

        expect(await isSymlinkInside(source, join(source, 'inside-link'))).toBe(true);
        expect(await isSymlinkInside(source, join(source, 'outside-link'))).toBe(false);
    });
});

describe('capability mode metadata', () => {
    it('annotates and reads supported modes with and without existing frontmatter', () => {
        const plain = annotateSupportedModes('# Skill\n\nBody.\n', ['cli']);
        expect(plain.startsWith('---\nsupported-modes: [cli]\n---\n')).toBe(true);
        expect(readSupportedModes(plain)).toEqual(['cli']);

        const withFrontmatter = annotateSupportedModes('---\nname: build\n---\n\n# Skill\n', ['app', 'lib']);
        expect(withFrontmatter).toContain('name: build\nsupported-modes: [app, lib]');
        expect(readSupportedModes(withFrontmatter)).toEqual(['app', 'lib']);

        const reAnnotated = annotateSupportedModes(withFrontmatter, ['mono']);
        expect(readSupportedModes(reAnnotated)).toEqual(['mono']);
        expect(reAnnotated.match(/supported-modes/g)?.length).toBe(1);

        expect(readSupportedModes('# Plain skill\n')).toBeNull();
    });

    it('prunes capabilities whose annotation excludes the chosen mode', async () => {
        const root = await tempRoot();
        await write(join(root, '.claude/skills/generic/SKILL.md'), '# Generic\n');
        await write(join(root, '.claude/skills/cli-only/SKILL.md'), '---\nsupported-modes: [cli]\n---\n\n# CLI only\n');
        await write(join(root, '.claude/commands/app-only.md'), '---\nsupported-modes: [app]\n---\n\n# App only\n');
        await write(join(root, '.claude/commands/everywhere.md'), '# Everywhere\n');

        const removed = await pruneModeScopedCapabilities(root, 'app');

        expect(removed.sort()).toEqual([join(root, '.claude/skills/cli-only')]);
        expect(await Bun.file(join(root, '.claude/skills/generic/SKILL.md')).exists()).toBe(true);
        expect(await Bun.file(join(root, '.claude/commands/app-only.md')).exists()).toBe(true);
        expect(await Bun.file(join(root, '.claude/commands/everywhere.md')).exists()).toBe(true);
        expect(await Bun.file(join(root, '.claude/skills/cli-only/SKILL.md')).exists()).toBe(false);
    });

    it('wires the .agents/skills symlink only when the canonical tree exists, replacing dangling links', async () => {
        const root = await tempRoot();

        expect(await wireAgentSkillsSymlink(root)).toBe(false);
        expect(await lstat(join(root, '.agents/skills')).catch(() => null)).toBeNull();

        await write(join(root, '.claude/skills/example/SKILL.md'), '# Example\n');
        await mkdir(join(root, '.agents'), { recursive: true });
        await symlink(join(root, 'missing-target'), join(root, '.agents/skills'));

        expect(await wireAgentSkillsSymlink(root)).toBe(true);
        expect(await realpath(join(root, '.agents/skills'))).toBe(await realpath(join(root, '.claude/skills')));

        // Idempotent re-run keeps a valid link.
        expect(await wireAgentSkillsSymlink(root)).toBe(true);
        expect(await realpath(join(root, '.agents/skills'))).toBe(await realpath(join(root, '.claude/skills')));
    });

    it('never clobbers a real directory at .agents/skills', async () => {
        const root = await tempRoot();
        await write(join(root, '.claude/skills/example/SKILL.md'), '# Example\n');
        await write(join(root, '.agents/skills/keep.md'), 'real directory content\n');

        expect(await wireAgentSkillsSymlink(root)).toBe(false);
        expect(await readFile(join(root, '.agents/skills/keep.md'), 'utf8')).toBe('real directory content\n');
    });
});

function rawCandidate(type: RawCandidate['type'], relativeSourcePath: string, content: string): RawCandidate {
    return {
        id: `${type}:${relativeSourcePath}`,
        type,
        sourcePath: relativeSourcePath,
        relativeSourcePath,
        destinationPath: relativeSourcePath,
        content,
    };
}

export function reviewCandidateIds(review: CapabilityReview): string[] {
    return review.candidates.map((candidate) => candidate.id);
}
