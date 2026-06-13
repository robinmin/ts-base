/** Minimal structured-output utility for monorepo apps. */
const encoder = new TextEncoder();

function format(...args: unknown[]): string {
    return `${args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')}\n`;
}

/** Structured-output logger for monorepo apps. */
export const logger = {
    info(...args: unknown[]): void {
        Bun.write(Bun.stdout, encoder.encode(format(...args)));
    },
    error(...args: unknown[]): void {
        Bun.write(Bun.stderr, encoder.encode(format(...args)));
    },
    warn(...args: unknown[]): void {
        Bun.write(Bun.stderr, encoder.encode(format(...args)));
    },
};
