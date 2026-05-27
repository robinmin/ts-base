import { describe, expect, it } from 'bun:test';
import { db } from '../src/index.js';

describe('db', () => {
    it('does not connect on import and returns a memoized client', () => {
        // Importing the module must not throw even without DATABASE_URL set,
        // because the client is constructed lazily.
        const first = db();
        const second = db();
        expect(first).toBe(second);
    });
});
