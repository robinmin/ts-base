import { describe, expect, it } from 'bun:test';
import { effectiveCodePortState, mergeCodeTracking } from '../../agent-convergence/tracking';
import type { ReviewOnlyCodeCandidate } from '../../agent-convergence/types';

const candidate: ReviewOnlyCodeCandidate = {
    id: 'code:src:ids.ts',
    type: 'code',
    sourcePath: '/source/src/ids.ts',
    relativeSourcePath: 'src/ids.ts',
    discoveryStrategy: 'review-only',
    destinationPath: null,
    sourceDigest: 'a'.repeat(64),
    extractionTarget: 'ts-libs',
    handPortChecklist: [],
    classification: 'ts-libs-candidate',
    supportedModes: ['app', 'lib', 'cli', 'mono'],
    rationale: [],
    requiredConfirmation: true,
};

describe('code-port tracking', () => {
    it('returns pending without a decision and needs-review after source drift', () => {
        expect(effectiveCodePortState(candidate, undefined)).toBe('pending');
        expect(
            effectiveCodePortState(candidate, {
                sourceKey: 'source',
                candidateId: candidate.id,
                reviewedSourceDigest: 'b'.repeat(64),
                state: 'approved',
                updatedAt: '2026-07-16T00:00:00.000Z',
            }),
        ).toBe('needs-review');
    });

    it('joins decisions by source key and stable candidate id without mutating tracking', () => {
        const tracking = {
            schemaVersion: 1 as const,
            entries: [
                {
                    sourceKey: 'source',
                    candidateId: candidate.id,
                    reviewedSourceDigest: candidate.sourceDigest,
                    state: 'approved' as const,
                    updatedAt: '2026-07-16T00:00:00.000Z',
                },
            ],
        };
        expect(mergeCodeTracking('source', [candidate], tracking)[0]?.state).toBe('approved');
        expect(tracking.entries[0]?.state).toBe('approved');
    });
});
