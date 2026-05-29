import { describe, expect, it } from 'bun:test';
import { getSecureRandomId } from '../index';

describe('getSecureRandomId (node)', () => {
    it('produces a hyphen-separated, base64url-safe id', () => {
        const id = getSecureRandomId();
        const [time, rand] = id.split('-');
        expect(time).toBeTruthy();
        expect(rand).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('produces a different id on each call', () => {
        expect(getSecureRandomId()).not.toBe(getSecureRandomId());
    });
});
