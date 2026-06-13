import { db } from './connection';

/** A user row from the database. */
export interface User {
    id: number;
    email: string;
}

export { db };

/** Find a user by email address. */
export async function findUserByEmail(email: string): Promise<User | undefined> {
    const rows = await db()<User[]>`SELECT id, email FROM users WHERE email = ${email} LIMIT 1`;
    return rows[0];
}

/** Create a new user and return the inserted row. */
export async function createUser(email: string): Promise<User> {
    const [user] = await db()<User[]>`INSERT INTO users ${db()({ email })} RETURNING id, email`;
    if (!user) {
        throw new Error('insert returned no row');
    }
    return user;
}
