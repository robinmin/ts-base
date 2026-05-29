import { describe, expect, it } from 'bun:test';

describe('orpc client', () => {
    it('exports a typed client with the planet contract procedures', async () => {
        const { orpc } = await import('../src/orpc');
        expect(orpc).toBeDefined();
        expect(typeof orpc.list).toBe('function');
        expect(typeof orpc.find).toBe('function');
        expect(typeof orpc.create).toBe('function');
    });
});
