import { describe, expect, it } from 'bun:test';
import { add, getRandomId, greet } from '../internal';

describe('add', () => {
    it('sums two numbers', () => {
        expect(add(2, 3)).toBe(5);
    });
});

describe('greet', () => {
    it('returns a plain greeting by default', () => {
        expect(greet('Robin')).toBe('Hello, Robin.');
    });

    it('shouts when the shout option is set', () => {
        expect(greet('Robin', { shout: true })).toBe('HELLO, ROBIN!');
    });
});

describe('getRandomId', () => {
    it('derives the random part from the injected RNG for determinism', () => {
        const id = getRandomId(() => 0);
        expect(id.endsWith('-0')).toBe(true);
    });
});
