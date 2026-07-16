import { join } from 'node:path';
import { BLOCKED_CLASSIFICATIONS } from './classify';
import { ensureParentDirectory } from './paths';
import type {
    CapabilityCandidate,
    CapabilityReview,
    ConvergenceScanOptions,
    CopyCandidate,
    ProposedChange,
} from './types';
import { isCopyCandidate } from './types';

async function proposeChange(candidate: CopyCandidate): Promise<ProposedChange> {
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

/** Build a capability review from classified candidates, diffing existing destinations. */
export async function createReview(
    options: ConvergenceScanOptions,
    candidates: CapabilityCandidate[],
): Promise<CapabilityReview> {
    const sensitiveCode = candidates.filter(
        (candidate) => candidate.discoveryStrategy === 'review-only' && candidate.classification === 'sensitive',
    );
    const publicCandidates = candidates.filter((candidate) => !sensitiveCode.includes(candidate));
    const proposedChanges = await Promise.all(publicCandidates.filter(isCopyCandidate).map(proposeChange));
    const blocked = publicCandidates
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
        candidates: publicCandidates,
        proposedChanges,
        blocked,
        redactions: { sensitiveCount: sensitiveCode.length },
        risks: blocked.map((entry) => `Blocked candidate ${entry.candidateId} (${entry.classification}).`),
        openQuestions: publicCandidates
            .filter((candidate) => candidate.classification === 'unknown')
            .map((candidate) => `Candidate ${candidate.id} requires manual review: ${candidate.rationale.join(' ')}`),
    };
}

function escapeTableCell(text: string): string {
    return text.replaceAll('|', '\\|');
}

/** Render a capability review as a markdown report. */
export function renderReview(review: CapabilityReview): string {
    const copyCandidates = review.candidates.filter(isCopyCandidate);
    const codeCandidates = review.candidates.filter((candidate) => candidate.discoveryStrategy === 'review-only');
    const lines = [
        '# Agent Capability Convergence Review',
        '',
        `- Source project: \`${review.sourceProject}\``,
        `- Target mode: \`${review.targetMode}\``,
        `- Created at: \`${review.createdAt}\``,
        '',
        `- Sensitive code candidates redacted: ${review.redactions?.sensitiveCount ?? 0}`,
        '',
        '## Copy Candidates',
        '',
        '| ID | Type | Classification | Destination | Rationale |',
        '| -- | ---- | -------------- | ----------- | --------- |',
    ];

    for (const candidate of copyCandidates) {
        lines.push(
            `| \`${escapeTableCell(candidate.id)}\` | ${candidate.type} | ${candidate.classification} | \`${escapeTableCell(candidate.destinationPath)}\` | ${escapeTableCell(candidate.rationale.join(' '))} |`,
        );
    }

    lines.push(
        '',
        '## Review-only Code Candidates',
        '',
        '| ID | Relative path | Digest | Classification | Extraction target | Modes | Destination | Rationale | Hand-port checklist |',
        '| -- | ------------- | ------ | -------------- | ----------------- | ----- | ----------- | --------- | ------------------- |',
    );
    for (const candidate of codeCandidates) {
        lines.push(
            `| \`${escapeTableCell(candidate.id)}\` | \`${escapeTableCell(candidate.relativeSourcePath)}\` | \`${candidate.sourceDigest}\` | ${candidate.classification} | ${candidate.extractionTarget} | ${candidate.supportedModes.join(', ')} | N/A (hand adaptation) | ${escapeTableCell(candidate.rationale.join(' '))} | ${escapeTableCell(candidate.handPortChecklist.join(' '))} |`,
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

/** Persist a review as JSON and markdown files on disk. */
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

/** Read a serialized review artifact from disk. */
export async function readReview(path: string): Promise<CapabilityReview> {
    return (await Bun.file(path).json()) as CapabilityReview;
}
