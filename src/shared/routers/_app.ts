import { router, publicProcedure } from '@shared/trpc';
import pkg from '../../../package.json';
import { windowRouter } from '@shared/routers/window';
import { storageRouter } from '@shared/routers/storage';
import { notesRouter } from './notes';
import { fileAttachmentsRouter } from './fileAttachments';
import { smartHubsRouter } from './smartHubs';
import { vectorStorageRouter } from './vectorStorage';
import { updatesRouter } from './updates';

/**
 * Main TRPC router for the Electron main process
 * Combines all sub-routers into a single API surface
 */
export const mainAppRouter = router({
  /**
   * Window management functionality
   * Controls window state (minimize, maximize, close)
   */
  window: windowRouter,

  /**
   * Returns the current application version from package.json
   */
  getVersion: publicProcedure.query(() => {
    try {
      return pkg.version;
    } catch (error) {
      console.error('Error getting application version:', error);
      return '0.0.0';
    }
  }),

  /**
   * PouchDB document storage operations
   */
  store: storageRouter,

  /**
   * Note management operations
   * Handles CRUD, search, and indexing for notes
   */
  notes: notesRouter,

  /**
   * File attachment operations
   * Handles reading and processing external files
   */
  fileAttachments: fileAttachmentsRouter,

  /**
   * Smart Hub operations for external document management
   * Handles file selection, indexing, and semantic search
   */
  smartHubs: smartHubsRouter,

  /**
   * Vector storage operations for semantic search
   * Unified API for vector embedding storage and retrieval
   */
  vectorStorage: vectorStorageRouter,

  /**
   * Application update operations
   * Handles checking for updates, download progress, and installation
   */
  updates: updatesRouter,
});

/**
 * Export type definition of API
 * Used by the client to ensure type safety
 */
export type AppRouter = typeof mainAppRouter;
