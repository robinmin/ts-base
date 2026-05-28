// CLI client. Twin of apps/web/src/orpc.ts — kept separate because env access
// differs: the CLI reads `process.env` at run time, while the web client uses
// Vite's build-time `import.meta.env.VITE_*`.

import type { planetContract } from '@SCOPE/api';
import { createORPCClient } from '@orpc/client';
import { RPCLink } from '@orpc/client/fetch';
import type { ContractRouterClient } from '@orpc/contract';

const link = new RPCLink({
    url: process.env.API_URL ?? 'http://localhost:3000/rpc',
});

export const orpc: ContractRouterClient<typeof planetContract> = createORPCClient(link);
