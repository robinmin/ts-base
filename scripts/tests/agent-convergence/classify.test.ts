import { describe, expect, it } from 'bun:test';
import { classifyCandidate } from '../../agent-convergence/classify';

describe('classify module', () => {
    it('exports classifyCandidate', () => {
        expect(classifyCandidate).toBeFunction();
    });

    it('classifies project-specific code before reusable code', () => {
        const candidate = classifyCandidate(
            {
                id: 'code:src:cloud.ts',
                type: 'code',
                sourcePath: '/source/src/cloud.ts',
                relativeSourcePath: 'src/cloud.ts',
                destinationPath: null,
                content: "export const bucket = 's3://internal';\n",
                sourceDigest: 'a'.repeat(64),
            },
            { projectMarkers: [] },
        );
        expect(candidate.classification).toBe('project-specific');
        expect(candidate.discoveryStrategy).toBe('review-only');
        expect(candidate.destinationPath).toBeNull();
    });

    it('classifies export-bearing generic code as a blocked ts-libs candidate', () => {
        const candidate = classifyCandidate({
            id: 'code:src:ids.ts',
            type: 'code',
            sourcePath: '/source/src/ids.ts',
            relativeSourcePath: 'src/ids.ts',
            destinationPath: null,
            content: 'export function id(value: string): string { return value; }\n',
            sourceDigest: 'b'.repeat(64),
        });
        expect(candidate.classification).toBe('ts-libs-candidate');
        expect(candidate.discoveryStrategy).toBe('review-only');
        if (candidate.discoveryStrategy === 'review-only') {
            expect(candidate.extractionTarget).toBe('ts-libs');
        }
    });
});
