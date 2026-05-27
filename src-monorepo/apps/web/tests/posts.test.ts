import { describe, expect, it } from 'bun:test';
import { likesLabel, samplePosts } from '../src/posts.js';

describe('likesLabel', () => {
    it('renders the total likes from shared api logic', () => {
        expect(likesLabel(samplePosts)).toBe('21 likes');
    });
});
