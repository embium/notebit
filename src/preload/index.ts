/**
 * Preload script entry point
 * Exposes secure APIs to the renderer process
 */

import { contextBridge } from 'electron';
import { exposeElectronTRPC } from 'electron-trpc/main';

// Import all API modules
import { windowApi } from './api/window';
import { systemApi } from './api/system';
import { storageApi } from './api/storage';

// Expose TRPC for communication with main process
process.once('loaded', () => {
  exposeElectronTRPC();
});

// Expose custom APIs to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  window: windowApi,
  system: systemApi,
  storage: storageApi,
});

// Type definitions for the exposed APIs
export interface ElectronAPI {
  window: typeof windowApi;
  system: typeof systemApi;
  storage: typeof storageApi;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
