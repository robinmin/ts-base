import { db } from './connection.js';

export interface User {
    id: number;
    email: string;
}

export { db };

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
