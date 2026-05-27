#!/usr/bin/env bun
import { createProgram } from './cli.js';

if (import.meta.main) {
    createProgram().parse();
}
