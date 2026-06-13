import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { logger, z } from '../src/index';

describe('utils', () => {
    it('re-exports zod', () => {
        expect(z.string().parse('hello')).toBe('hello');
    });
});

describe('logger', () => {
    let stdoutCalls: string[];
    let origWrite: typeof Bun.write;

    beforeEach(() => {
        stdoutCalls = [];
        origWrite = Bun.write;
        Bun.write = ((dest: unknown, data: Uint8Array) => {
            if (dest === Bun.stdout) stdoutCalls.push(new TextDecoder().decode(data));
            return Promise.resolve(data.length);
        }) as typeof Bun.write;
    });

    afterEach(() => {
        Bun.write = origWrite;
    });

    it('info writes to Bun.stdout', () => {
        logger.info('hello');
        expect(stdoutCalls).toEqual(['hello\n']);
    });

    it('error writes to Bun.stderr', () => {
        const stderrCalls: string[] = [];
        Bun.write = ((dest: unknown, data: Uint8Array) => {
            const text = new TextDecoder().decode(data);
            if (dest === Bun.stderr) stderrCalls.push(text);
            return Promise.resolve(data.length);
        }) as typeof Bun.write;

        logger.error('fail');
        expect(stderrCalls).toEqual(['fail\n']);
    });

    it('warn writes to Bun.stderr', () => {
        const stderrCalls: string[] = [];
        Bun.write = ((dest: unknown, data: Uint8Array) => {
            const text = new TextDecoder().decode(data);
            if (dest === Bun.stderr) stderrCalls.push(text);
            return Promise.resolve(data.length);
        }) as typeof Bun.write;

        logger.warn('caution');
        expect(stderrCalls).toEqual(['caution\n']);
    });
});
