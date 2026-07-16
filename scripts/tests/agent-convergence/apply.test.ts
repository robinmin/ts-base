import { describe, expect, it } from 'bun:test';
import { applyApprovedCandidates } from '../../agent-convergence/apply';
import { classifyCandidate } from '../../agent-convergence/classify';

describe('apply module', () => {
    it('exports applyApprovedCandidates', () => {
        expect(applyApprovedCandidates).toBeFunction();
    });

    it('blocks review-only code before entering the writable apply path', async () => {
        const candidate = classifyCandidate({
            id: 'code:src:ids.ts',
            type: 'code',
            sourcePath: '/source/does-not-exist.ts',
            relativeSourcePath: 'src/ids.ts',
            destinationPath: null,
            content: 'export const id = 1;\n',
            sourceDigest: 'a'.repeat(64),
        });
        const result = await applyApprovedCandidates(
            {
                sourceProject: '/source',
                targetRoot: '/target',
                targetMode: 'mono',
                createdAt: '2026-07-16T00:00:00.000Z',
                candidates: [candidate],
                proposedChanges: [],
                blocked: [],
                redactions: { sensitiveCount: 0 },
            },
            [candidate.id],
        );
        expect(result).toEqual({ applied: [], skipped: [], blocked: [candidate.id] });
    });
});
