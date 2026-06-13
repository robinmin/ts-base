/**
 * Flattens an intersection or mapped type into a single object literal so
 * editor hover tooltips show `{ a: string; b: number }` instead of `A & B`.
 * Compile-time only — emits no runtime code.
 */
export type Prettify<T> = {
    [K in keyof T]: T[K];
} & {};

// Re-export zod so every workspace package gets it through utils.
export type { ZodSchema, ZodType } from 'zod';
export { z } from 'zod';

export { logger } from './logger';
