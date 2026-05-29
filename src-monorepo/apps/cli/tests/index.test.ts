import { describe, expect, it, mock, spyOn } from 'bun:test';

// Shared mock planets used by both run() and main() tests.
const mockPlanets = [
    { id: 1, name: 'Earth' },
    { id: 2, name: 'Mars' },
];

function mockOrpc() {
    mock.module('../src/orpc.js', () => ({
        orpc: {
            list: mock(async () => mockPlanets),
            create: mock(async ({ name }: { name: string }) => ({ id: 3, name })),
        },
    }));
}

describe('run', () => {
    it('defaults to list when no args', async () => {
        mockOrpc();
        const { run } = await import('../src/cli');
        const result = await run([]);
        expect(result).toBe('1. Earth\n2. Mars');
    });

    it('list command returns formatted planet names', async () => {
        mockOrpc();
        const { run } = await import('../src/cli');
        const result = await run(['list']);
        expect(result).toBe('1. Earth\n2. Mars');
    });

    it('create command with name returns created planet', async () => {
        mockOrpc();
        const { run } = await import('../src/cli');
        const result = await run(['create', 'Venus']);
        expect(result).toBe('Created: 3. Venus');
    });

    it('create command defaults name to Unknown', async () => {
        mockOrpc();
        const { run } = await import('../src/cli');
        const result = await run(['create']);
        expect(result).toBe('Created: 3. Unknown');
    });

    it('rejects unknown commands', async () => {
        mockOrpc();
        const { run } = await import('../src/cli');
        expect(await run(['bogus'])).toBe('Unknown command: bogus');
    });
});

describe('main', () => {
    it('prints run result to stdout', async () => {
        mockOrpc();
        const logSpy = spyOn(console, 'info').mockImplementation(() => {});
        try {
            const { main } = await import('../src/cli');
            await main(['list']);
            expect(logSpy).toHaveBeenCalledWith('1. Earth\n2. Mars');
        } finally {
            logSpy.mockRestore();
        }
    });

    it('logs error and exits on failure', async () => {
        mock.module('../src/orpc.js', () => ({
            orpc: {
                list: mock(async () => {
                    throw new Error('boom');
                }),
            },
        }));
        const errSpy = spyOn(console, 'error').mockImplementation(() => {});
        const exitSpy = spyOn(process, 'exit').mockImplementation((() => {}) as never);
        try {
            const { main } = await import('../src/cli');
            await main(['list']);
            expect(errSpy).toHaveBeenCalled();
            expect(exitSpy).toHaveBeenCalledWith(1);
        } finally {
            errSpy.mockRestore();
            exitSpy.mockRestore();
        }
    });
});
