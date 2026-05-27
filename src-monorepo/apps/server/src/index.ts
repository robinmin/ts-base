import { config } from '../../../packages/config/src/index.js';
import { app } from './app.js';

const server = Bun.serve({
    port: config.port,
    fetch: app.fetch,
});

console.info(`Server running at http://localhost:${server.port}`);
