/**
 * TRPC Router Exports
 *
 * This file provides a centralized export point for all TRPC routers.
 * Each router handles a specific domain of the application.
 */

// Main application router that combines all sub-routers
export { mainAppRouter } from './_app';
export type { AppRouter } from './_app';

// Individual feature routers
export { windowRouter } from './window';
export { storageRouter } from './storage';
export { notesRouter } from './notes';
export { fileAttachmentsRouter } from './fileAttachments';
export { smartHubsRouter } from './smartHubs';
export { vectorStorageRouter } from './vectorStorage';
export { ollamaRouter } from './ollama';
