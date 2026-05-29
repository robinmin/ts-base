import { describe, expect, it } from 'bun:test';
import { loadConfig } from '../src/index';

describe('loadConfig', () => {
    it('defaults to port 3000 when PORT is unset', () => {
        expect(loadConfig({}).port).toBe(3000);
    });

    it('reads the PORT environment variable', () => {
        expect(loadConfig({ PORT: '8080' }).port).toBe(8080);
    });
});
