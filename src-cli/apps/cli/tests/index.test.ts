import { describe, expect, it, mock } from 'bun:test';
import { createProgram } from '../src/cli';

describe('cli', () => {
    it('createProgram returns a commander instance with an add command', () => {
        const program = createProgram();
        const addCmd = program.commands.find((c) => c.name() === 'add');
        expect(addCmd).toBeDefined();
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
});
