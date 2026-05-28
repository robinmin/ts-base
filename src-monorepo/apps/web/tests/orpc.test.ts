import { describe, expect, it, mock } from 'bun:test';

mock.module('@orpc/client/fetch', () => ({
    RPCLink: class {
        call = mock(async () => ({ json: [] }));
    },
}));

describe('orpc client', () => {
    it('exports a typed client with known procedures', async () => {
        const mod = await import('../src/orpc.js');
        expect(mod.orpc).toBeDefined();
        expect(typeof mod.orpc.list).toBe('function');
        expect(typeof mod.orpc.find).toBe('function');
        expect(typeof mod.orpc.create).toBe('function');
    });
});
