import { QueryClient } from '@tanstack/react-query';
import { createTRPCReact } from '@trpc/react-query';
import { createTRPCProxyClient } from '@trpc/client';
import { ipcLink } from 'electron-trpc/renderer';
import type { AppRouter } from '../routers/_app';

/**
 * React tRPC client creator
 *
 * Creates a typed React-specific tRPC client that integrates with React Query.
 * This client allows components to use hooks like useQuery, useMutation, and useSubscription
 * with full type-safety based on our AppRouter definition.
 */
const t = createTRPCReact<AppRouter>();

/**
 * TanStack Query Client configuration
 *
 * This client manages all data fetching, caching, and synchronization for the application.
 * It's used by both React Query hooks and tRPC React hooks internally.
 *
 * Configuration notes:
 * - networkMode: "always" ensures queries/mutations don't depend on online/offline browser status
 *   which is appropriate for Electron where "network" is actually IPC to the main process
 * - cacheTime: Number.POSITIVE_INFINITY keeps query results in memory indefinitely
 *   which is optimal for Electron desktop apps because:
 *   1. Memory constraints are less restrictive than in web browsers
 *   2. Data is local and relatively small (notes, settings, etc.)
 *   3. The app lifetime is limited to the user's session
 *   4. It prevents unnecessary refetching of data from the main process
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: 'always',
      cacheTime: Number.POSITIVE_INFINITY,
    },
    mutations: {
      networkMode: 'always',
      cacheTime: Number.POSITIVE_INFINITY,
    },
  },
});

/**
 * React component-compatible tRPC client instance
 *
 * This client is used with the tRPC Provider component and enables React hooks
 * for data fetching. It's specifically designed to work with React components
 * and React's rendering lifecycle.
 *
 * Uses ipcLink() exclusively since we're in an Electron renderer process
 * communicating with the main process (no HTTP required).
 */
export const trpcClient = t.createClient({
  links: [ipcLink()],
});

/**
 * Non-React utility tRPC client
 *
 * A standalone tRPC client for use outside React components and hooks.
 * This client is used for imperative calls in utility functions, services,
 * or any non-React context where hooks can't be used.
 *
 * Example usage:
 * ```
 * // In a utility function outside a React component
 * export async function saveData() {
 *   await trpcProxyClient.someRouter.someProcedure.mutate({ data });
 * }
 * ```
 */
export const trpcProxyClient = createTRPCProxyClient<AppRouter>({
  links: [ipcLink()],
});

export default t;
