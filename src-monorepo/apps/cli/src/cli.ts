import { orpc } from './orpc.js';

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

export async function main(argv: string[]): Promise<void> {
    try {
        const result = await run(argv);
        console.info(result);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
