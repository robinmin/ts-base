import { describe, expect, it } from 'bun:test';
import { add } from '../src/index';

describe('add', () => {
    it('sums two numbers', () => {
        expect(add(2, 3)).toBe(5);
    });
});
