import { config } from '@SCOPE/config';
import { add } from '@SCOPE/utils';
import { Command } from 'commander';

export function createProgram(): Command {
    const program = new Command().name('cli').description('Example CLI application').version('0.0.0');

    const parseIntArg = (v: string): number => Number.parseInt(v, 10);

    program
        .command('add')
        .description('Add two numbers')
        .argument('<a>', 'first number', parseIntArg)
        .argument('<b>', 'second number', parseIntArg)
        .action((a, b) => {
            process.stdout.write(`${add(a, b)}\n`);
        });

    program
        .command('config')
        .description('Show current configuration')
        .action(() => {
            process.stdout.write(`${JSON.stringify(config, null, 2)}\n`);
        });

    return program;
}
