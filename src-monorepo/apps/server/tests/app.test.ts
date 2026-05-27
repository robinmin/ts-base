import { describe, expect, it } from 'bun:test';
import { app } from '../src/app.js';

describe('server routes', () => {
    it('GET /health returns ok', async () => {
        const res = await app.request('/health');
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ status: 'ok' });
    });

    it('GET /posts/likes sums likes via @SCOPE/api', async () => {
        const res = await app.request('/posts/likes');
        expect(await res.json()).toEqual({ total: 42 });
    });
});
