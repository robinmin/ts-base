import { afterEach, beforeEach, describe, expect, it } from 'bun:test';

describe('config', () => {
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
        originalEnv = { ...process.env };
    });

    afterEach(() => {
        process.env = originalEnv;
        delete require.cache[require.resolve('../src/index.js')];
    });

    it('defaults to port 3000 when PORT is unset', async () => {
        process.env.PORT = undefined;
        const { config } = await import('../src/index.js');
        expect(config.port).toBe(3000);
    });

    it('reads the PORT environment variable', async () => {
        process.env.PORT = '8080';
        const { config } = await import('../src/index.js');
        expect(config.port).toBe(8080);
    });
});
