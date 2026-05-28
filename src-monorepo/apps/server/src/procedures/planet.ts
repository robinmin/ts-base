import type { Planet } from '@SCOPE/api';
import { planetContract } from '@SCOPE/api';
import { implement } from '@orpc/server';

// In-memory store for the demo — swap in a real DB in production.
const planets: Planet[] = [];

function nextId(): number {
    return planets.length + 1;
}

const os = implement(planetContract);

export const listPlanet = os.list
    .handler(async ({ input }) => {
        const start = input.cursor;
        const end = start + (input.limit ?? 10);
        return planets.slice(start, end);
    })
    .callable();

export const findPlanet = os.find
    .handler(async ({ input }) => {
        const planet = planets.find((p) => p.id === input.id);
        if (!planet) throw new Error('Not found');
        return planet;
    })
    .callable();

export const createPlanet = os.create
    .handler(async ({ input }) => {
        const planet: Planet = { id: nextId(), ...input };
        planets.push(planet);
        return planet;
    })
    .callable();

export const router = os.router({
    list: listPlanet,
    find: findPlanet,
    create: createPlanet,
});
