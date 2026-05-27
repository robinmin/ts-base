/**
 * Flattens an intersection or mapped type into a single object literal so
 * editor hover tooltips show `{ a: string; b: number }` instead of
 * `A & B`. Purely a compile-time ergonomics helper — emits no runtime code.
 */
export type Prettify<T> = {
    [K in keyof T]: T[K];
} & {};
