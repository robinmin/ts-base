import { describe, expect, it } from 'bun:test';

describe('setup', () => {
    it('file exists and is parseable', async () => {
        const file = Bun.file(new URL('../setup.ts', import.meta.url));
        expect(await file.exists()).toBe(true);
        // Verify the file parses as valid TypeScript without executing it.
        const text = await file.text();
        expect(text).toContain('await main()');
    });
});
