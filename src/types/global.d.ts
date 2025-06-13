/**
 * Global type definitions
 * Ambient types that are available throughout the application
 */

/// <reference types="vite/client" />

// Global state type
declare global {
  export type GlobalState = {
    colorMode: 'dark' | 'light';
  };

  // Extend the Window interface with Electron API
  interface Window {
    api: import('./index').ElectronAPI;
  }
}

// Ensure this file is treated as a module
export {};
