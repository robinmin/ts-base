import { describe, expect, it } from 'bun:test';
import { resolveInside } from '../../agent-convergence/paths';

describe('paths module', () => {
    it('exports resolveInside', () => {
        expect(resolveInside).toBeFunction();
    });
});
