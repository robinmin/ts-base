// Shared script blocks emitted into the promoted package.json. Defining them
// here keeps the four modes from drifting out of sync as scripts evolve.

const SHARED_SCRIPTS = {
    prepare: 'lefthook install',
    test: 'NODE_ENV=test bun test --coverage --coverage-dir=.coverage --reporter=dots',
    'test:full': 'NODE_ENV=test bun test --update-snapshots --coverage --coverage-dir=.coverage',
    typecheck: 'tsc --noEmit',
    lint: 'biome check . && bun run typecheck',
    format: 'biome check . --write',
    autofix: 'bun run format && bun run typecheck',
    check: 'bun run lint && bun run test',
};

export const APP_SCRIPTS = {
    ...SHARED_SCRIPTS,
    start: 'bun run src/index.ts',
    dev: 'bun --watch run src/index.ts',
};

export const LIB_SCRIPTS = {
    ...SHARED_SCRIPTS,
    build: 'tsdown',
    dev: 'tsdown --watch',
    size: 'size-limit',
};
