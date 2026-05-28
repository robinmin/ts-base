import type { Planet } from '@SCOPE/api';
import { planetContract } from '@SCOPE/api';
import { implement, ORPCError } from '@orpc/server';

// In-memory store for the demo — swap in a real DB in production.
const planets: Planet[] = [];
let idCounter = 0;

function nextId(): number {
    idCounter += 1;
    return idCounter;
}

// Test-only: reset the in-memory store between suites.
export function _resetPlanets(): void {
    planets.length = 0;
    idCounter = 0;
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
        if (!planet) {
            throw new ORPCError('NOT_FOUND', { message: `Planet ${input.id} not found` });
        }
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
