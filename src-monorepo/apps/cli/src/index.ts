#!/usr/bin/env bun
import { add } from '@SCOPE/utils';

export function run(args: string[]): string {
    const nums = args.map(Number).filter((n) => !Number.isNaN(n));
    const sum = nums.reduce((acc, n) => add(acc, n), 0);
    return `sum = ${sum}`;
}

// Only execute when run directly, not when imported by tests.
if (import.meta.main) {
    console.info(run(Bun.argv.slice(2)));
}
