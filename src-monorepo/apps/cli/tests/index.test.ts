import { describe, expect, it, mock } from 'bun:test';
import { main, run } from '../src/cli.js';

describe('cli', () => {
    it('run sums numeric args via utils', () => {
        expect(run(['1', '2', '3'])).toBe('sum = 6');
    });

    it('run ignores non-numeric args', () => {
        expect(run(['1', 'x', '4'])).toBe('sum = 5');
    });

    it('main prints run result to stdout', () => {
        const spy = mock(() => {});
        const original = console.info;
        console.info = spy;
        try {
            main(['10', '20']);
            expect(spy).toHaveBeenCalledWith('sum = 30');
        } finally {
            console.info = original;
        }
    });
});
