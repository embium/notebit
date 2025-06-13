import type { Context } from '@shared/context';
import { initTRPC } from '@trpc/server';

/**
 * tRPC initializer - creates a type-safe API builder with context
 * This is the main entry point for creating tRPC router instances.
 * The context type is passed here to ensure type-safety across all router definitions.
 */
const t = initTRPC.context<Context>().create({
  isServer: true, // Indicates this is running on server/main-process side
});

/**
 * tRPC middleware exporter
 * Middleware can be used to add custom logic that runs before/after procedure calls.
 * Use cases include: logging, input validation, authentication, and authorization.
 */
export const middleware = t.middleware;

/**
 * tRPC router exporter
 * Routers are used to group related procedures together into logical units.
 * Each feature typically has its own router (e.g., notesRouter, windowRouter).
 */
export const router = t.router;

/**
 * Public procedure creator
 * Procedures are the endpoints of your API that clients can call.
 * This creates procedures without any middleware attached.
 * For protected routes, you would create a new procedure with middleware.
 */
export const publicProcedure = t.procedure;
