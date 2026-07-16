import type {
    CodePortEntry,
    CodePortState,
    CodePortTracking,
    CodePortTrackingView,
    ReviewOnlyCodeCandidate,
} from './types';

/** Resolve a tracked decision without mutating either scan evidence or tracking state. */
export function effectiveCodePortState(
    candidate: ReviewOnlyCodeCandidate,
    entry: CodePortEntry | undefined,
): CodePortState | 'needs-review' {
    if (!entry) {
        return 'pending';
    }
    return entry.reviewedSourceDigest === candidate.sourceDigest ? entry.state : 'needs-review';
}

/** Join immutable scan evidence to durable operator decisions. */
export function mergeCodeTracking(
    sourceKey: string,
    candidates: ReviewOnlyCodeCandidate[],
    tracking: CodePortTracking,
): CodePortTrackingView[] {
    return candidates.map((candidate) => {
        const entry = tracking.entries.find(
            (item) => item.sourceKey === sourceKey && item.candidateId === candidate.id,
        );
        return {
            sourceKey,
            candidateId: candidate.id,
            state: effectiveCodePortState(candidate, entry),
            ...(entry ? { entry } : {}),
        };
    });
}
