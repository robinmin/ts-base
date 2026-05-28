import { describe, expect, it } from 'bun:test';
import { loadConfig } from '../config.js';

describe('loadConfig', () => {
    it('defaults port to 3000 when PORT is unset', () => {
        expect(loadConfig({}).port).toBe(3000);
    });

    it('reads PORT from the environment', () => {
        expect(loadConfig({ PORT: '8080' }).port).toBe(8080);
    });

    it('rejects an out-of-range port', () => {
        expect(() => loadConfig({ PORT: '100000' })).toThrow();
    });
});
