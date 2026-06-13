/**
 *  Minimal structured-output seam for ts-base scripts. Routes all terminal
 *  writes through Bun.write so Spur output-boundary checks pass cleanly.
 */
const encoder = new TextEncoder();

function format(...args: unknown[]): Uint8Array {
    return encoder.encode(`${args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')}\n`);
}

/** Structured-output logger for ts-base scripts. Set `silent = true` to mute during tests. */
export const logger = {
    silent: false,

    info(...args: unknown[]): void {
        if (this.silent) return;
        Bun.write(Bun.stdout, format(...args));
    },
    error(...args: unknown[]): void {
        if (this.silent) return;
        Bun.write(Bun.stderr, format(...args));
    },
    /** Write without a trailing newline (prompt-style). */
    prompt(text: string): void {
        if (this.silent) return;
        Bun.write(Bun.stdout, encoder.encode(text));
    },
};
