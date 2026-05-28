import { afterEach, beforeEach, describe, expect, it } from 'bun:test';

describe('Configuration Tests', () => {
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
        originalEnv = { ...process.env };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    describe('Default Configuration', () => {
        it('should use default port 3000 when no PORT env var is set', async () => {
            process.env.PORT = undefined;

            const { config } = await import('../config.ts');

            expect(config.port).toBe(3000);
        });
    });

    describe('Environment Variable Configuration', () => {
        it('should use PORT environment variable when set', async () => {
            process.env.PORT = '8080';

            const { config } = await import(`../config.ts?v=${crypto.randomUUID()}`);

            expect(config.port).toBe(8080);
        });
    });

    describe('Port Validation', () => {
        it('should validate port is within valid range', async () => {
            process.env.PORT = '100000';

            await expect(import(`../config.ts?v=${crypto.randomUUID()}`)).rejects.toThrow();
        });
    });
});
