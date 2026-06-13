// Web client. Twin of apps/cli/src/orpc.ts — kept separate because env access
// differs: Vite exposes `import.meta.env.VITE_*` at build time, while the
// CLI reads `process.env` at run time.

import type { planetContract } from '@SCOPE/api';
import { createORPCClient } from '@orpc/client';
import { RPCLink } from '@orpc/client/fetch';
import type { ContractRouterClient } from '@orpc/contract';

const link = new RPCLink({
    url: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/rpc',
});

/** Typed oRPC client for the server contract, from the web app. */
export const orpc: ContractRouterClient<typeof planetContract> = createORPCClient(link);
