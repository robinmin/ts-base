import { add } from '../../../packages/utils/src/index.js';

export function run(args: string[]): string {
    const nums = args.map(Number).filter((n) => !Number.isNaN(n));
    const sum = nums.reduce((acc, n) => add(acc, n), 0);
    return `sum = ${sum}`;
}

export function main(argv: string[]): void {
    console.info(run(argv));
}
