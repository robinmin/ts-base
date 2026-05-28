import { config } from '@SCOPE/config';
import { add } from '@SCOPE/utils';
import { Command } from 'commander';

export function createProgram(): Command {
    const program = new Command().name('cli').description('Example CLI application').version('0.0.0');

    program
        .command('add')
        .description('Add two numbers')
        .argument('<a>', 'first number', parseInt)
        .argument('<b>', 'second number', parseInt)
        .action((a, b) => {
            console.log(add(a, b));
        });

    program
        .command('config')
        .description('Show current configuration')
        .action(() => {
            console.log(JSON.stringify(config, null, 2));
        });

    return program;
}
