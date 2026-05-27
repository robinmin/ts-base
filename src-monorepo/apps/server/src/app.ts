import { Hono } from 'hono';
import { type Post, totalLikes } from '../../../packages/api/src/index.js';

export const app = new Hono();

app.get('/health', (c) => c.json({ status: 'ok' }));

app.get('/posts/likes', (c) => {
    const posts: Post[] = [
        { id: 1, title: 'Bun + Hono', likes: 12 },
        { id: 2, title: 'Monorepo', likes: 30 },
    ];
    return c.json({ total: totalLikes(posts) });
});
