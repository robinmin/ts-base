import { config } from '@SCOPE/config';
import { logger } from '@SCOPE/utils';
import { app } from './app';

const server = Bun.serve({
    port: config.port,
    fetch: app.fetch,
});

logger.info(`Server running at http://localhost:${server.port}`);
