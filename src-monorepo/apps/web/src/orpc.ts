import type { ContractRouterClient, planetContract } from '@SCOPE/api';
import { createORPCClient } from '@orpc/client';
import { RPCLink } from '@orpc/client/fetch';

const link = new RPCLink({
    url: 'http://localhost:3000/rpc',
});

export const orpc: ContractRouterClient<typeof planetContract> = createORPCClient(link);
