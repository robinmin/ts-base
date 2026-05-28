import { z } from 'zod';

const ConfigSchema = z.object({
    port: z.coerce.number().int().min(1).max(65535).default(3000),
});

export type ServerConfig = z.infer<typeof ConfigSchema>;

// Factory: parses the current environment. Tests construct one per case
// instead of relying on dynamic-import cache busts to re-run a top-level side
// effect.
export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
    return ConfigSchema.parse({ port: env.PORT });
}

export const config: ServerConfig = loadConfig();
