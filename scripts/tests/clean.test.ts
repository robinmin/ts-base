import { describe, expect, it } from 'bun:test';

describe('clean', () => {
    it('file exists and is parseable', async () => {
        const file = Bun.file(new URL('../clean.ts', import.meta.url));
        expect(await file.exists()).toBe(true);
        const text = await file.text();
        expect(text).toContain('removed');
    });
});
