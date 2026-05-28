import { describe, expect, it } from 'bun:test';
import { type Prettify, z } from '../src/index.js';

describe('utils', () => {
    it('re-exports zod', () => {
        expect(z.string().parse('hello')).toBe('hello');
    });
});

// Prettify is a type-level helper with no runtime output, so it is verified at
// compile time: a structural equality assertion that fails to typecheck if the
// flattened shape ever diverges from the intended object literal.
type Expect<T extends true> = T;
type Equal<A, B> = (<G>() => G extends A ? 1 : 2) extends <G>() => G extends B ? 1 : 2 ? true : false;

type Intersection = { a: string } & { b: number };

describe('Prettify', () => {
    it('flattens an intersection while preserving its values at runtime', () => {
        const _assertFlattened: Expect<Equal<Prettify<Intersection>, { a: string; b: number }>> = true;
        const value: Prettify<Intersection> = { a: 'x', b: 1 };

        expect(_assertFlattened).toBe(true);
        expect(value).toEqual({ a: 'x', b: 1 });
    });
});
