import { config } from '@SCOPE/config';
import { app } from './app.js';

try {
    const server = Bun.serve({
        port: config.port,
        fetch: app.fetch,
    });

    console.info(`Server running at http://localhost:${server.port}`);
} catch (err) {
    console.error('Failed to start server:', err instanceof Error ? err.message : err);
    process.exit(1);
}
