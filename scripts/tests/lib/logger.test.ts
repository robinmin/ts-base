import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { logger } from '../../lib/logger';

describe('logger', () => {
    let stdoutCalls: string[];
    let stderrCalls: string[];
    let origWrite: typeof Bun.write;

    beforeEach(() => {
        stdoutCalls = [];
        stderrCalls = [];
        origWrite = Bun.write;
        Bun.write = ((dest: unknown, data: Uint8Array) => {
            const text = new TextDecoder().decode(data);
            if (dest === Bun.stdout) stdoutCalls.push(text);
            else if (dest === Bun.stderr) stderrCalls.push(text);
            return Promise.resolve(data.length);
        }) as typeof Bun.write;
    });

    afterEach(() => {
        Bun.write = origWrite;
    });

    it('info writes to Bun.stdout', () => {
        logger.info('hello');
        expect(stdoutCalls).toEqual(['hello\n']);
        expect(stderrCalls).toEqual([]);
    });

    it('info joins multiple args', () => {
        logger.info('x', 42);
        expect(stdoutCalls).toEqual(['x 42\n']);
    });

    it('info serializes objects with JSON', () => {
        logger.info({ a: 1 });
        expect(stdoutCalls).toEqual(['{"a":1}\n']);
    });

    it('error writes to Bun.stderr', () => {
        logger.error('fail');
        expect(stderrCalls).toEqual(['fail\n']);
    });

    it('prompt writes without trailing newline', () => {
        logger.prompt('> ');
        expect(stdoutCalls).toEqual(['> ']);
    });
});
