import { describe, expect, it } from 'bun:test';
import { classifyCandidate } from '../../agent-convergence/classify';

describe('classify module', () => {
    it('exports classifyCandidate', () => {
        expect(classifyCandidate).toBeFunction();
    });
});
