import { describe, expect, it } from 'bun:test';
import { run } from '../src/index.js';

describe('cli run', () => {
    it('sums numeric args via @SCOPE/utils', () => {
        expect(run(['1', '2', '3'])).toBe('sum = 6');
    });

    it('ignores non-numeric args', () => {
        expect(run(['1', 'x', '4'])).toBe('sum = 5');
    });
});
