#!/usr/bin/env bun
import { main } from './cli.js';

if (import.meta.main) {
    await main(Bun.argv.slice(2));
}
