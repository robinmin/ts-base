#!/usr/bin/env bun
import { main } from './cli.js';

if (import.meta.main) {
    main(Bun.argv.slice(2));
}
