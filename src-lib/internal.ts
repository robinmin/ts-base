// Runtime-agnostic core. Keep Node- and browser-specific APIs out of this file
// so it runs unchanged in any JS runtime (Bun, Node, browser, edge).

export interface CoreOptions {
    shout?: boolean;
}

export function add(a: number, b: number): number {
    return a + b;
}

export function greet(name: string, options: CoreOptions = {}): string {
    const base = `Hello, ${name}`;
    return options.shout ? `${base.toUpperCase()}!` : `${base}.`;
}

// Inject the RNG so tests can make the output deterministic.
export function getRandomId(random: () => number = Math.random): string {
    const timePart = Date.now().toString(36);
    const randPart = Math.floor(random() * 1e9).toString(36);
    return `${timePart}-${randPart}`;
}
