import { describe, expect, it } from 'bun:test';
import { orpc } from '../src/orpc';

describe('orpc', () => {
    it('exports an orpc client', () => {
        expect(orpc).toBeDefined();
        expect(orpc.list).toBeFunction();
    });
});
