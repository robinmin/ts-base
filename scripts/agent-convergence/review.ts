import { join } from 'node:path';
import { BLOCKED_CLASSIFICATIONS } from './classify';
import { ensureParentDirectory } from './paths';
import type { CapabilityCandidate, CapabilityReview, ConvergenceScanOptions, ProposedChange } from './types';

async function proposeChange(candidate: CapabilityCandidate): Promise<ProposedChange> {
    if (BLOCKED_CLASSIFICATIONS.has(candidate.classification)) {
        return {
            candidateId: candidate.id,
            action: 'skip',
            destinationPath: candidate.destinationPath,
            reason: candidate.rationale.join(' '),
        };
    }

    const destination = Bun.file(candidate.destinationPath);
    if (await destination.exists()) {
        const existing = await destination.text();
        const source = await Bun.file(candidate.sourcePath).text();
        const identical = existing.trimEnd() === source.trimEnd();
        return {
            candidateId: candidate.id,
            action: identical ? 'skip' : 'update',
            destinationPath: candidate.destinationPath,
            reason: identical
                ? 'Destination already matches source content.'
                : 'Destination exists with different content; review the diff before approving.',
        };
    }

    return {
        candidateId: candidate.id,
        action: 'create',
        destinationPath: candidate.destinationPath,
        reason: candidate.rationale.join(' '),
    };
}

export async function createReview(
    options: ConvergenceScanOptions,
    candidates: CapabilityCandidate[],
): Promise<CapabilityReview> {
    const proposedChanges = await Promise.all(candidates.map(proposeChange));
    const blocked = candidates
        .filter((candidate) => BLOCKED_CLASSIFICATIONS.has(candidate.classification))
        .map((candidate) => ({
            candidateId: candidate.id,
            classification: candidate.classification,
            reason: candidate.rationale.join(' '),
        }));

    return {
        sourceProject: options.sourceProject,
        targetRoot: options.targetRoot,
        targetMode: options.targetMode,
        createdAt: new Date().toISOString(),
        candidates,
        proposedChanges,
        blocked,
        risks: blocked.map((entry) => `Blocked candidate ${entry.candidateId} (${entry.classification}).`),
        openQuestions: candidates
            .filter((candidate) => candidate.classification === 'unknown')
            .map((candidate) => `Candidate ${candidate.id} requires manual review: ${candidate.rationale.join(' ')}`),
    };
}

function escapeTableCell(text: string): string {
    return text.replaceAll('|', '\\|');
}

export function renderReview(review: CapabilityReview): string {
    const lines = [
        '# Agent Capability Convergence Review',
        '',
        `- Source project: \`${review.sourceProject}\``,
        `- Target mode: \`${review.targetMode}\``,
        `- Created at: \`${review.createdAt}\``,
        '',
        '## Candidates',
        '',
        '| ID | Type | Classification | Destination | Rationale |',
        '| -- | ---- | -------------- | ----------- | --------- |',
    ];

    for (const candidate of review.candidates) {
        lines.push(
            `| \`${escapeTableCell(candidate.id)}\` | ${candidate.type} | ${candidate.classification} | \`${escapeTableCell(candidate.destinationPath)}\` | ${escapeTableCell(candidate.rationale.join(' '))} |`,
        );
    }

    lines.push('', '## Blocked', '');
    if (review.blocked.length === 0) {
        lines.push('No blocked candidates.');
    } else {
        for (const blocked of review.blocked) {
            lines.push(`- \`${blocked.candidateId}\` (${blocked.classification}) — ${blocked.reason}`);
        }
    }

    const risks = review.risks ?? [];
    const openQuestions = review.openQuestions ?? [];
    lines.push('', '## Risks', '');
    lines.push(...(risks.length > 0 ? risks.map((risk) => `- ${risk}`) : ['No identified risks.']));
    lines.push('', '## Open Questions', '');
    lines.push(...(openQuestions.length > 0 ? openQuestions.map((question) => `- ${question}`) : ['None.']));

    return `${lines.join('\n')}\n`;
}

export async function writeReviewArtifacts(
    review: CapabilityReview,
    reviewDir: string,
    reviewId: string,
): Promise<{ jsonPath: string; markdownPath: string }> {
    const jsonPath = join(reviewDir, `${reviewId}.json`);
    const markdownPath = join(reviewDir, `${reviewId}.md`);
    await ensureParentDirectory(jsonPath);
    await Bun.write(jsonPath, `${JSON.stringify(review, null, 4)}\n`);
    await Bun.write(markdownPath, renderReview(review));
    return { jsonPath, markdownPath };
}

export async function readReview(path: string): Promise<CapabilityReview> {
    return (await Bun.file(path).json()) as CapabilityReview;
}
