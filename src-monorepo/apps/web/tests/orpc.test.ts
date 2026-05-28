import { describe, expect, it } from 'bun:test';

describe('orpc client', () => {
    it('exports a typed client', async () => {
        const mod = await import('../src/orpc.js');
        expect(mod.orpc).toBeDefined();
        expect(typeof mod.orpc.list).toBe('function');
    });
});
