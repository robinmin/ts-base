import { describe, expect, it, mock } from 'bun:test';
import { createProgram } from '../src/cli.js';

describe('cli', () => {
    it('createProgram returns a commander instance with add and config commands', () => {
        const program = createProgram();
        const addCmd = program.commands.find((c) => c.name() === 'add');
        const configCmd = program.commands.find((c) => c.name() === 'config');
        expect(addCmd).toBeDefined();
        expect(configCmd).toBeDefined();
    });

    it('add command writes the sum to stdout', () => {
        const spy = mock((_chunk: string | Uint8Array) => true);
        const original = process.stdout.write.bind(process.stdout);
        process.stdout.write = spy as typeof process.stdout.write;

        try {
            const program = createProgram();
            program.parse(['add', '3', '4'], { from: 'user' });
            expect(spy).toHaveBeenCalledWith('7\n');
        } finally {
            process.stdout.write = original;
        }
    });

    it('config command writes the config JSON to stdout', () => {
        const spy = mock((_chunk: string | Uint8Array) => true);
        const original = process.stdout.write.bind(process.stdout);
        process.stdout.write = spy as typeof process.stdout.write;

        try {
            const program = createProgram();
            program.parse(['config'], { from: 'user' });
            expect(spy).toHaveBeenCalledTimes(1);
            const firstCall = spy.mock.calls[0];
            expect(firstCall).toBeDefined();
            const output = JSON.parse(firstCall?.[0] as string);
            expect(output.port).toBe(3000);
        } finally {
            process.stdout.write = original;
        }
    });
});
