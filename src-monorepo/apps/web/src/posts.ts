import { type Post, totalLikes } from '../../../packages/api/src/index.js';

// Demonstrates sharing types and logic with the server through the api package —
// no duplicated shapes, no network schema, just a cross-package import.
export const samplePosts: Post[] = [
    { id: 1, title: 'Bun + Vite', likes: 8 },
    { id: 2, title: 'Shared types', likes: 13 },
];

export function likesLabel(posts: Post[]): string {
    return `${totalLikes(posts)} likes`;
}
