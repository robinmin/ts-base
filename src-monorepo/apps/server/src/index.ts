import { config } from '@SCOPE/config';
import { app } from './app';

const server = Bun.serve({
    port: config.port,
    fetch: app.fetch,
});

console.info(`Server running at http://localhost:${server.port}`);
