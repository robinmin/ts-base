/**
 * Reference pattern for Bun's native SQL driver — zero dependencies, no ORM.
 * Bun ships a Postgres/MySQL/SQLite client under the `bun` module; tagged-template
 * queries are parameterized (the `${...}` values are bound, not interpolated), so
 * this is injection-safe by default.
 *
 * This file is a copy-me example, not wired into the app. Rename to `db.ts`,
 * adapt, and delete this header — or delete the file if you don't need a database.
 *
 * Docs: https://bun.sh/docs/api/sql
 */
import { SQL } from 'bun';

export interface User {
    id: number;
    email: string;
}

// Reads the connection string from $DATABASE_URL by default; pass one explicitly
// if you prefer. Lazily connects on first query.
const sql = new SQL(process.env.DATABASE_URL ?? '');

export async function findUserByEmail(email: string): Promise<User | undefined> {
    // `email` is bound as a parameter, not string-interpolated.
    const rows = await sql<User[]>`SELECT id, email FROM users WHERE email = ${email} LIMIT 1`;
    return rows[0];
}

export async function createUser(email: string): Promise<User> {
    const [user] = await sql<User[]>`
        INSERT INTO users ${sql({ email })}
        RETURNING id, email
    `;
    if (!user) {
        throw new Error('insert returned no row');
    }
    return user;
}

export async function close(): Promise<void> {
    await sql.close();
}
