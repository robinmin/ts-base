import { afterEach, beforeEach, describe, expect, it } from 'bun:test';

describe('config', () => {
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
        originalEnv = { ...process.env };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it('defaults to port 3000 when PORT is unset', async () => {
        process.env.PORT = undefined;
        const { config } = await import('../src/index.ts');
        expect(config.port).toBe(3000);
    });

    it('reads the PORT environment variable', async () => {
        process.env.PORT = '8080';
        const { config } = await import(`../src/index.ts?v=${crypto.randomUUID()}`);
        expect(config.port).toBe(8080);
    });
});
