import { describe, expect, it } from 'bun:test';
import { createReview } from '../../agent-convergence/review';

describe('review module', () => {
    it('exports createReview', () => {
        expect(createReview).toBeFunction();
    });
});
