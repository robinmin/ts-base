import { relative } from 'node:path';
import { annotateSupportedModes, wireAgentSkillsSymlink } from './capabilities';
import { BLOCKED_CLASSIFICATIONS, classifyCandidate } from './classify';
import { ensureParentDirectory, resolveInside } from './paths';
import type { ApplyResult, CapabilityCandidate, CapabilityReview, CopyCandidate } from './types';
import { isCopyCandidate } from './types';

function canApply(candidate: CapabilityCandidate, review: CapabilityReview): candidate is CopyCandidate {
    if (!isCopyCandidate(candidate)) {
        return false;
    }
    if (BLOCKED_CLASSIFICATIONS.has(candidate.classification)) {
        return false;
    }
    if (candidate.classification === 'mode-specific' && !candidate.supportedModes.includes(review.targetMode)) {
        return false;
    }
    return true;
}

/**
 *  Apply only explicitly approved candidates to the target project. Re-checks
 *  classification from live source content so content changes between scan and
 *  apply cannot bypass the blocklist.
 */
export async function applyApprovedCandidates(review: CapabilityReview, approvedIds: string[]): Promise<ApplyResult> {
    const approved = new Set(approvedIds);
    const result: ApplyResult = { applied: [], skipped: [], blocked: [] };

    for (const candidate of review.candidates) {
        if (!approved.has(candidate.id)) {
            result.skipped.push(candidate.id);
            continue;
        }
        if (!canApply(candidate, review)) {
            result.blocked.push(candidate.id);
            continue;
        }

        // Re-classify from current source content so edits between scan and
        // apply (or a tampered artifact classification) cannot bypass blocking.
        const content = await Bun.file(candidate.sourcePath).text();
        const liveCandidate = classifyCandidate({
            id: candidate.id,
            type: candidate.type,
            sourcePath: candidate.sourcePath,
            relativeSourcePath: candidate.relativeSourcePath,
            destinationPath: candidate.destinationPath,
            content,
        });
        if (!canApply(liveCandidate, review)) {
            result.blocked.push(candidate.id);
            continue;
        }

        const destination = resolveInside(review.targetRoot, relative(review.targetRoot, candidate.destinationPath));
        let output = content.endsWith('\n') ? content : `${content}\n`;
        if (candidate.classification === 'mode-specific') {
            output = annotateSupportedModes(output, candidate.supportedModes);
        }
        await ensureParentDirectory(destination);
        await Bun.write(destination, output);
        result.applied.push(candidate.id);
    }

    if (result.applied.length > 0) {
        await wireAgentSkillsSymlink(review.targetRoot);
    }

    return result;
}
