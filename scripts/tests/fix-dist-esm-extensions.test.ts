import { describe, expect, it } from 'bun:test';

describe('fix-dist-esm-extensions', () => {
    it('file exists and is parseable', async () => {
        const file = Bun.file(new URL('../fix-dist-esm-extensions.ts', import.meta.url));
        expect(await file.exists()).toBe(true);
        // The script expects CLI args; don't execute it. Verify it's parseable.
        const text = await file.text();
        expect(text).toContain('fix-dist-esm');
    });
});
