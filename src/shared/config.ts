import { QueryClient } from "@tanstack/react-query";
import { createTRPCReact } from "@trpc/react-query";
import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import { ipcLink } from "electron-trpc/renderer";
import type { AppRouter } from "./routers/_app";

// React tRPC client (for React components)
const t = createTRPCReact<AppRouter>();

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: "always",
      cacheTime: Number.POSITIVE_INFINITY,
    },
    mutations: {
      networkMode: "always",
      cacheTime: Number.POSITIVE_INFINITY,
    },
  },
});

export const trpcClient = t.createClient({
  links: [ipcLink()],
});

// Non-React tRPC client (for utility functions)
export const trpcProxyClient = createTRPCProxyClient<AppRouter>({
  links: [ipcLink()],
});

export default t;
