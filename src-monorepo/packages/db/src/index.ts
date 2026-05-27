/**
 * Database access via Bun's native SQL driver — zero dependencies, no ORM.
 * Tagged-template queries are parameterized (values are bound, not interpolated),
 * so they are injection-safe by default. Docs: https://bun.sh/docs/api/sql
 *
 * The client connects lazily on first query, so importing this module is cheap
 * and does not require a live database (handy for tests).
 */
import { SQL } from 'bun';

export interface User {
    id: number;
    email: string;
}

let client: SQL | undefined;

// Lazily constructed so importing the package never opens a connection.
export function db(): SQL {
    client ??= new SQL(process.env.DATABASE_URL ?? '');
    return client;
}

export async function findUserByEmail(email: string): Promise<User | undefined> {
    const rows = await db()<User[]>`SELECT id, email FROM users WHERE email = ${email} LIMIT 1`;
    return rows[0];
}

export async function createUser(email: string): Promise<User> {
    const [user] = await db()<User[]>`INSERT INTO users ${db()({ email })} RETURNING id, email`;
    if (!user) {
        throw new Error('insert returned no row');
    }
    return user;
}
