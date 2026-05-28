import { z } from '@SCOPE/utils';
import { oc } from '@orpc/contract';

export const PlanetSchema = z.object({
    id: z.number().int().min(1),
    name: z.string(),
    description: z.string().optional(),
});

export const listPlanet = oc
    .input(
        z.object({
            limit: z.number().int().min(1).max(100).optional(),
            cursor: z.number().int().min(0).default(0),
        }),
    )
    .output(z.array(PlanetSchema));

export const findPlanet = oc.input(PlanetSchema.pick({ id: true })).output(PlanetSchema);

export const createPlanet = oc.input(PlanetSchema.omit({ id: true })).output(PlanetSchema);

export type Planet = z.infer<typeof PlanetSchema>;

export const planetContract = {
    list: listPlanet,
    find: findPlanet,
    create: createPlanet,
};
