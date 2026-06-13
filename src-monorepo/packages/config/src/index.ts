import { z } from 'zod';

const ConfigSchema = z.object({
    port: z.coerce.number().int().min(1).max(65535).default(3000),
});

/** Server configuration shape. */
export type ServerConfig = z.infer<typeof ConfigSchema>;

/** Load server configuration from environment. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
    return ConfigSchema.parse({ port: env.PORT });
}

/** Resolved server configuration instance. */
export const config: ServerConfig = loadConfig();
