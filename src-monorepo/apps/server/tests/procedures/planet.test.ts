import { beforeEach, describe, expect, it } from 'bun:test';
import { _resetPlanets, createPlanet, findPlanet, listPlanet } from '../../src/procedures/planet';

describe('planet procedures', () => {
    beforeEach(() => {
        _resetPlanets();
    });

    describe('createPlanet', () => {
        it('creates and returns a planet with auto-id', async () => {
            const planet = await createPlanet({ name: 'Earth' });
            expect(planet.id).toBe(1);
            expect(planet.name).toBe('Earth');
        });

        it('increments id for each subsequent planet', async () => {
            await createPlanet({ name: 'Earth' });
            const second = await createPlanet({ name: 'Mars', description: 'Red planet' });
            expect(second.id).toBe(2);
            expect(second.name).toBe('Mars');
            expect(second.description).toBe('Red planet');
        });
    });

    describe('listPlanet', () => {
        beforeEach(async () => {
            await createPlanet({ name: 'Earth' });
            await createPlanet({ name: 'Mars' });
        });

        it('lists all planets with defaults', async () => {
            const result = await listPlanet({ cursor: 0 });
            expect(result).toHaveLength(2);
            expect(result[0]?.name).toBe('Earth');
            expect(result[1]?.name).toBe('Mars');
        });

        it('respects limit', async () => {
            const result = await listPlanet({ cursor: 0, limit: 1 });
            expect(result).toHaveLength(1);
        });

        it('respects cursor offset', async () => {
            const result = await listPlanet({ cursor: 1, limit: 10 });
            expect(result).toHaveLength(1);
            expect(result[0]?.name).toBe('Mars');
        });
    });

    describe('findPlanet', () => {
        it('finds a planet by id', async () => {
            await createPlanet({ name: 'Earth' });
            const planet = await findPlanet({ id: 1 });
            expect(planet.name).toBe('Earth');
        });

        it('throws ORPCError NOT_FOUND for missing planet', async () => {
            await expect(findPlanet({ id: 999 })).rejects.toMatchObject({
                code: 'NOT_FOUND',
                message: 'Planet 999 not found',
            });
        });
    });
});
