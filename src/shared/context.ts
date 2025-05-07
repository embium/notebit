import type { inferAsyncReturnType } from '@trpc/server';
import { BrowserWindow, ipcMain } from 'electron';
import { store } from './storage';
import { EventEmitter } from 'events';

// Create a singleton event emitter for the entire application
export const eventEmitter = new EventEmitter();

// Set up event forwarding from the event emitter to renderer processes via IPC
eventEmitter.on('NOTES_CHANGED', () => {
  // Forward the event to all renderer processes
  const windows = BrowserWindow.getAllWindows();
  for (const window of windows) {
    if (!window.isDestroyed()) {
      window.webContents.send('NOTES_CHANGED');
    }
  }
});

export async function createContext() {
  const browserWindow = BrowserWindow.getFocusedWindow();

  return {
    window: browserWindow,
    store,
    ee: eventEmitter, // Add the event emitter to the context
  };
}

export type Context = inferAsyncReturnType<typeof createContext>;
