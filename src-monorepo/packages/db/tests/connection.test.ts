import { describe, expect, it } from 'bun:test';
import { db } from '../src/connection';

describe('db connection', () => {
    it('exports db factory', () => {
        expect(db).toBeFunction();
    });
});
