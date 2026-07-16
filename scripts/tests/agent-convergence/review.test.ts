import { describe, expect, it } from 'bun:test';
import { classifyCandidates } from '../../agent-convergence/classify';
import { createReview } from '../../agent-convergence/review';

describe('review module', () => {
    it('exports createReview', () => {
        expect(createReview).toBeFunction();
    });

    it('redacts sensitive code and never creates code proposed changes', async () => {
        const options = {
            sourceProject: '/source',
            targetRoot: '/target',
            targetMode: 'mono' as const,
            typeFilter: 'code' as const,
            code: { roots: ['src'], maxFileBytes: 262_144, maxCandidates: 500 },
        };
        const candidates = classifyCandidates([
            {
                id: 'code:src:secret.ts',
                type: 'code',
                sourcePath: '/source/src/secret.ts',
                relativeSourcePath: 'src/secret.ts',
                destinationPath: null,
                content: "export const apiKey = 'abcdefghijklmnop';\n",
                sourceDigest: 'a'.repeat(64),
            },
            {
                id: 'code:src:ids.ts',
                type: 'code',
                sourcePath: '/source/src/ids.ts',
                relativeSourcePath: 'src/ids.ts',
                destinationPath: null,
                content: 'export const id = 1;\n',
                sourceDigest: 'b'.repeat(64),
            },
        ]);

        const review = await createReview(options, candidates);
        expect(review.redactions.sensitiveCount).toBe(1);
        expect(review.candidates.map((candidate) => candidate.id)).toEqual(['code:src:ids.ts']);
        expect(review.proposedChanges).toEqual([]);
        expect(review.blocked.map((candidate) => candidate.candidateId)).toEqual(['code:src:ids.ts']);
    });
});
