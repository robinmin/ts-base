#!/usr/bin/env bun
// Ensures the workspace scaffolds (src-cli, src-monorepo) have their
// dependencies installed so template-level `bun test` can resolve @SCOPE/*
// aliases via the workspace symlinks. Cheap when node_modules already exists.
import { access } from 'node:fs/promises';
import { $ } from 'bun';

const ROOT = new URL('..', import.meta.url).pathname;
const SCAFFOLDS = ['src-cli', 'src-monorepo'];

async function exists(path: string): Promise<boolean> {
    try {
        await access(path);
        return true;
    } catch {
        return false;
    }
}

for (const scaffold of SCAFFOLDS) {
    const nm = `${ROOT}/${scaffold}/node_modules`;
    if (await exists(nm)) {
        continue;
    }
    console.info(`installing ${scaffold} workspace deps…`);
    await $`bun install --silent`.cwd(`${ROOT}/${scaffold}`);
}
