import { onError } from '@orpc/server';
import { RPCHandler } from '@orpc/server/fetch';
import { Hono } from 'hono';
import { router } from './procedures/planet.js';

export const app = new Hono();

// Health check — vanilla Hono route, not an RPC procedure.
app.get('/health', (c) => c.json({ status: 'ok' }));

// oRPC handler — all contracts served under /rpc.
const handler = new RPCHandler(router, {
    interceptors: [onError((error) => console.error(error))],
});

app.use('/rpc/*', async (c, next) => {
    const { matched, response } = await handler.handle(c.req.raw, {
        prefix: '/rpc',
        context: {},
    });
    if (matched) return c.newResponse(response.body, response);
    await next();
});
