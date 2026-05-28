import { describe, expect, it } from 'bun:test';
import { z } from '../src/index.js';

describe('utils', () => {
    it('re-exports zod', () => {
        expect(z.string().parse('hello')).toBe('hello');
    });
});
