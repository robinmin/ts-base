import { describe, expect, it, mock } from 'bun:test';
import type { User } from '../src/index.js';

interface MockDb {
    (...args: unknown[]): unknown;
    setRows: (r: unknown[]) => void;
}

function createMockDb() {
    let rows: unknown[] = [];
    const fn = ((...args: unknown[]) => {
        if (Array.isArray(args[0]) && 'raw' in args[0]) {
            return Promise.resolve(rows);
        }
        return args[0];
    }) as MockDb;
    fn.setRows = (r: unknown[]) => {
        rows = r;
    };
    return fn;
}

const mockDb = createMockDb();

mock.module('../src/connection.js', () => ({
    db: () => mockDb,
}));

const { createUser, db, findUserByEmail } = await import('../src/index.js');

describe('db', () => {
    it('memoizes the SQL client', () => {
        expect(db()).toBe(db());
    });

    it('findUserByEmail returns the matching row', async () => {
        const user: User = { id: 42, email: 'a@b.com' };
        mockDb.setRows([user]);
        await expect(findUserByEmail('a@b.com')).resolves.toEqual(user);
    });

    it('findUserByEmail returns undefined when no match', async () => {
        mockDb.setRows([]);
        await expect(findUserByEmail('missing@b.com')).resolves.toBeUndefined();
    });

    it('createUser returns the inserted user', async () => {
        const user: User = { id: 7, email: 'new@b.com' };
        mockDb.setRows([user]);
        await expect(createUser('new@b.com')).resolves.toEqual(user);
    });

    it('createUser throws when insert returns no row', async () => {
        mockDb.setRows([]);
        await expect(createUser('bad@b.com')).rejects.toThrow('insert returned no row');
    });
});
