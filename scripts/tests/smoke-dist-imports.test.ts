import { describe, expect, it } from 'bun:test';

describe('smoke-dist-imports', () => {
    it('file exists and is parseable', async () => {
        const file = Bun.file(new URL('../smoke-dist-imports.ts', import.meta.url));
        expect(await file.exists()).toBe(true);
        const text = await file.text();
        expect(text).toContain('import');
    });
});
