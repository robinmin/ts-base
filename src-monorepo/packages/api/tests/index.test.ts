import { describe, expect, it } from 'bun:test';
import { PlanetSchema, planetContract } from '../src/index.js';

describe('PlanetSchema', () => {
    it('parses a valid planet', () => {
        const result = PlanetSchema.safeParse({ id: 1, name: 'Earth' });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.name).toBe('Earth');
        }
    });

    it('rejects a planet with missing name', () => {
        const result = PlanetSchema.safeParse({ id: 1 });
        expect(result.success).toBe(false);
    });
});

describe('planetContract', () => {
    it('has CRUD procedures', () => {
        expect(planetContract.list).toBeDefined();
        expect(planetContract.find).toBeDefined();
        expect(planetContract.create).toBeDefined();
    });
});
