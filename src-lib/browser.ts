// Browser entry point. Re-exports the core; uses Web Crypto instead of node:crypto.

export type { CoreOptions } from './internal.js';
export { add, getRandomId, greet } from './internal.js';

export function getSecureRandomId(): string {
    const timePart = Date.now().toString(36);
    const array = new Uint8Array(12);
    crypto.getRandomValues(array);
    const rand = btoa(String.fromCharCode(...array))
        .replaceAll('+', '-')
        .replaceAll('/', '_')
        .replaceAll('=', '');
    return `${timePart}-${rand}`;
}
