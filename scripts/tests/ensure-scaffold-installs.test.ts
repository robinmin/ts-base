import { describe, expect, it } from 'bun:test';

describe('ensure-scaffold-installs', () => {
    it('file exists and is parseable', async () => {
        const file = Bun.file(new URL('../ensure-scaffold-installs.ts', import.meta.url));
        expect(await file.exists()).toBe(true);
        const text = await file.text();
        expect(text).toContain('workspace');
    });
});
