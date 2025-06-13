/**
 * TRPC Configuration and Exports
 *
 * This file provides centralized exports for all TRPC-related functionality
 * including configuration, context, and routers.
 */

// Core TRPC configuration
export { router, publicProcedure, middleware } from '../config/trpc';

// Context creation and types
export { createContext, eventEmitter } from '../config/context';
export type { Context } from '../config/context';

// Router exports
export { mainAppRouter } from '../routers/_app';
export type { AppRouter } from '../routers/_app';
