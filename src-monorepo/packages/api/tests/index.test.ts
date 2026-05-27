import { describe, expect, it } from 'bun:test';
import { greetUser, type Post, totalLikes } from '../src/index.js';

describe('totalLikes', () => {
    it('sums likes across posts', () => {
        const posts: Post[] = [
            { id: 1, title: 'a', likes: 3 },
            { id: 2, title: 'b', likes: 4 },
        ];
        expect(totalLikes(posts)).toBe(7);
    });

    it('returns 0 for no posts', () => {
        expect(totalLikes([])).toBe(0);
    });
});

describe('greetUser', () => {
    it('greets by email', () => {
        expect(greetUser({ id: 1, email: 'a@b.com' })).toBe('Hello, a@b.com');
    });
});
