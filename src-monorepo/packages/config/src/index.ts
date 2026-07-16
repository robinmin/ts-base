import { z } from '@SCOPE/utils';

/** SQLite in-memory URL — used for tests and ephemeral processes. */
export const IN_MEMORY_DATABASE_URL = 'sqlite::memory:';

/** Default file-backed SQLite URL for local development. */
export const DEFAULT_DATABASE_URL = IN_MEMORY_DATABASE_URL;

const ConfigSchema = z.object({
    port: z.coerce.number().int().min(1).max(65535).default(3000),
    databaseUrl: z.string().default(DEFAULT_DATABASE_URL),
});

/** Server configuration shape. */
export type ServerConfig = z.infer<typeof ConfigSchema>;

/** Load server configuration from environment. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
    return ConfigSchema.parse({
        port: env.PORT,
        databaseUrl: env.DATABASE_URL,
    });
}

/** Resolved server configuration instance. */
export const config: ServerConfig = loadConfig();
