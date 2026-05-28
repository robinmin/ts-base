// Shared contracts consumed by the server (apps/server) and every client
// (apps/web, apps/cli). They are the single source of truth for API shapes,
// giving the monorepo end-to-end type safety without code generation.

// Re-export ContractRouterClient so clients don't need @orpc/contract installed.
export type { ContractRouterClient } from '@orpc/contract';
export {
    type createPlanet,
    type findPlanet,
    type listPlanet,
    type Planet,
    PlanetSchema,
    planetContract,
} from './contracts/planet.js';
