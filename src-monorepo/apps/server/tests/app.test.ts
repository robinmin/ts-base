import { describe, expect, it, spyOn } from 'bun:test';
import { app } from '../src/app.js';

const rpcBody = (input: unknown) => JSON.stringify({ json: input, meta: [] });

describe('server routes', () => {
    it('GET /health returns ok', async () => {
        const res = await app.request('/health');
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ status: 'ok' });
    });

    it('GET /rpc returns 404 (no matching procedure)', async () => {
        const res = await app.request('/rpc');
        expect(res.status).toBe(404);
    });

    it('POST /rpc/list calls the list procedure', async () => {
        const res = await app.request('/rpc/list', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: rpcBody({ cursor: 0 }),
        });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body).toHaveProperty('json');
        expect(body.json).toBeArray();
    });

    it('onError interceptor logs handler errors', async () => {
        const errSpy = spyOn(console, 'error').mockImplementation(() => {});
        try {
            const res = await app.request('/rpc/find', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: rpcBody({ id: 999 }),
            });
            expect(res.status).toBe(500);
            expect(errSpy).toHaveBeenCalled();
        } finally {
            errSpy.mockRestore();
        }
    });
});
