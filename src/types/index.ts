/**
 * Type definitions module
 * Central export point for all type definitions used throughout the application
 */

// Core type definitions
export * from './ai';
export * from './chats';
export * from './common';
export * from './notes';
export * from './promptsLibrary';
export * from './settings';
export * from './smartHubs';
export * from './supportedFiles';

// Electron-specific type definitions
export interface ElectronAPI {
  window: {
    minimize: () => void;
    maximize: () => void;
    close: () => void;
    isMaximized: () => Promise<boolean>;
    onMaximized: (callback: () => void) => () => void;
    onUnmaximized: (callback: () => void) => () => void;
    onEnterFullScreen: (callback: () => void) => () => void;
    onLeaveFullScreen: (callback: () => void) => () => void;
  };
  system: {
    getPlatform: () => string;
    getRelease: () => string;
    getArch: () => string;
    getNodeVersion: () => string;
    getAppVersion: () => Promise<string>;
    openExternal: (url: string) => Promise<void>;
    showItemInFolder: (path: string) => Promise<void>;
    openPath: (path: string) => Promise<void>;
    checkForUpdates: () => Promise<any>;
    downloadUpdate: () => Promise<any>;
    installUpdate: () => Promise<any>;
    onUpdateChecking: (callback: () => void) => () => void;
    onUpdateAvailable: (callback: (info: any) => void) => () => void;
    onUpdateNotAvailable: (callback: (info: any) => void) => () => void;
    onUpdateError: (callback: (error: string) => void) => () => void;
    onUpdateDownloadProgress: (callback: (progress: any) => void) => () => void;
    onUpdateDownloaded: (callback: (info: any) => void) => () => void;
  };
  storage: {
    get: (key: string) => Promise<any>;
    set: (key: string, value: any) => Promise<void>;
    delete: (key: string) => Promise<void>;
    clear: () => Promise<void>;
    keys: () => Promise<string[]>;
    has: (key: string) => Promise<boolean>;
    size: () => Promise<number>;
    getAll: () => Promise<Record<string, any>>;
    setMany: (items: Record<string, any>) => Promise<void>;
    deleteMany: (keys: string[]) => Promise<void>;
  };
}
