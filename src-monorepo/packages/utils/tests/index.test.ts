import { describe, expect, it } from 'bun:test';
import { z } from '../src/index';

describe('utils', () => {
    it('re-exports zod', () => {
        expect(z.string().parse('hello')).toBe('hello');
    });
});
