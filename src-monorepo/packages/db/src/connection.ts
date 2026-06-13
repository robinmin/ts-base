import { SQL } from 'bun';

let client: SQL | undefined;

/** Typed SQL query helper for the database connection. */
export function db(): SQL {
    client ??= new SQL(process.env.DATABASE_URL ?? '');
    return client;
}
