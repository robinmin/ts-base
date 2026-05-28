import { describe, expect, it } from 'bun:test';
import { createPlanet, findPlanet, listPlanet } from '../../src/procedures/planet.js';

describe('planet procedures', () => {
    // Seed the in-memory store so list/find have data to work with.
    // Tests run sequentially within the file, so ordering is deterministic.
    it('createPlanet — creates and returns a planet with auto-id', async () => {
        const planet = await createPlanet({ name: 'Earth' });
        expect(planet.id).toBe(1);
        expect(planet.name).toBe('Earth');
    });

    it('createPlanet — creates a second planet', async () => {
        const planet = await createPlanet({ name: 'Mars', description: 'Red planet' });
        expect(planet.id).toBe(2);
        expect(planet.name).toBe('Mars');
        expect(planet.description).toBe('Red planet');
    });

    it('listPlanet — lists all planets with defaults', async () => {
        const result = await listPlanet({ cursor: 0 });
        expect(result).toHaveLength(2);
        expect(result[0].name).toBe('Earth');
        expect(result[1].name).toBe('Mars');
    });

    it('listPlanet — respects limit', async () => {
        const result = await listPlanet({ cursor: 0, limit: 1 });
        expect(result).toHaveLength(1);
    });

    it('listPlanet — respects cursor offset', async () => {
        const result = await listPlanet({ cursor: 1, limit: 10 });
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('Mars');
    });

    it('findPlanet — finds a planet by id', async () => {
        const planet = await findPlanet({ id: 1 });
        expect(planet.name).toBe('Earth');
    });

    it('findPlanet — throws for missing planet', async () => {
        await expect(findPlanet({ id: 999 })).rejects.toThrow('Not found');
    });
});
