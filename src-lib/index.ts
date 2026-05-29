// Node/Bun entry point. Re-exports the core plus Node-specific helpers.

export type { CoreOptions } from './internal';
export { add, getRandomId, greet } from './internal';
export type { Prettify } from './types';

import { randomBytes } from 'node:crypto';

export function getSecureRandomId(): string {
    const timePart = Date.now().toString(36);
    const bytes = randomBytes(12).toString('base64url');
    return `${timePart}-${bytes}`;
}
