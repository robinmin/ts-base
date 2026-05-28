import type { ContractRouterClient, planetContract } from '@SCOPE/api';
import { createORPCClient } from '@orpc/client';
import { RPCLink } from '@orpc/client/fetch';

const link = new RPCLink({
    url: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/rpc',
});

export const orpc: ContractRouterClient<typeof planetContract> = createORPCClient(link);
