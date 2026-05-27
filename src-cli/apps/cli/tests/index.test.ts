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

    it('add command prints the sum', () => {
        const spy = mock(() => {});
        const original = console.log;
        console.log = spy;

        try {
            const program = createProgram();
            program.parse(['add', '3', '4'], { from: 'user' });
            expect(spy).toHaveBeenCalledWith(7);
        } finally {
            console.log = original;
        }
    });

    it('config command prints the config', () => {
        const spy = mock(() => {});
        const original = console.log;
        console.log = spy;

        try {
            const program = createProgram();
            program.parse(['config'], { from: 'user' });
            expect(spy).toHaveBeenCalledTimes(1);
            // Verify JSON output is valid
            const output = JSON.parse(spy.mock.calls[0][0]);
            expect(output.port).toBe(3000);
        } finally {
            console.log = original;
        }
    });
});
