import { logger } from '@SCOPE/utils';
import { orpc } from './orpc';

/** Run a CLI command (list or create) and return the formatted result. */
export async function run(args: string[]): Promise<string> {
    const cmd = args[0] ?? 'list';

    switch (cmd) {
        case 'list': {
            const planets = await orpc.list({});
            return planets.map((p) => `${p.id}. ${p.name}`).join('\n');
        }
        case 'create': {
            const name = args[1] ?? 'Unknown';
            const planet = await orpc.create({ name });
            return `Created: ${planet.id}. ${planet.name}`;
        }
        default:
            return `Unknown command: ${cmd}`;
    }
}

/** CLI entry point — runs a command and prints the result via logger. */
export async function main(argv: string[]): Promise<void> {
    try {
        const result = await run(argv);
        logger.info(result);
    } catch (err) {
        logger.error(err);
        process.exit(1);
    }
}
