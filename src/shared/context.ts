import type { inferAsyncReturnType } from '@trpc/server';
import { BrowserWindow } from 'electron';
import { store } from './storage';
import { EventEmitter } from 'events';

/**
 * Application-wide event emitter singleton
 *
 * This EventEmitter is used to facilitate communication between different parts
 * of the main process and to trigger TRPC subscriptions for renderer processes.
 *
 * Currently, the only event used is 'NOTES_CHANGED', which is emitted when the
 * file system watcher detects changes to notes files.
 *
 * Note: For more complex event patterns, consider fully migrating to TRPC subscriptions
 * as demonstrated in the notes.onFileSystemChanges and window.onMaximizeChange
 * subscription implementations, which provide type-safety and better separation
 * of concerns.
 */
export const eventEmitter = new EventEmitter();

/**
 * Creates the context object for TRPC procedures
 *
 * This function is called by createIPCHandler in src/main.ts
 * for each TRPC request from the renderer process.
 *
 * @returns {Object} Context object containing:
 *   - window: The currently focused Electron BrowserWindow
 *   - store: The persistent store for settings and other data
 *   - ee: The event emitter for subscription-based communication
 */
export async function createContext() {
  const browserWindow = BrowserWindow.getFocusedWindow();

  return {
    window: browserWindow,
    store,
    ee: eventEmitter,
  };
}

/**
 * Type definition for the TRPC context
 * Used for type-safety throughout the TRPC router implementations
 */
export type Context = inferAsyncReturnType<typeof createContext>;
