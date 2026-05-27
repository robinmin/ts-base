import type { User } from '../../db/src/index.js';
import { add } from '../../utils/src/index.js';

// Shared contract consumed by both the server (apps/server) and the web client
// (apps/web). Living in a package is what gives the monorepo end-to-end type
// safety without a network-level schema.
export interface Post {
    id: number;
    title: string;
    likes: number;
}

export type { User };

// Pure business logic — easy to unit test, reused across apps.
export function totalLikes(posts: Post[]): number {
    return posts.reduce((sum, post) => add(sum, post.likes), 0);
}

export function greetUser(user: User): string {
    return `Hello, ${user.email}`;
}
