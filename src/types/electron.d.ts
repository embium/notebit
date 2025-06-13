/**
 * Electron-specific type definitions
 * Types for Electron main process and IPC communication
 */

import { BrowserWindow } from 'electron';
import type { Context } from '../shared/config/context';

// IPC channel names
export type IPCChannels =
  | 'window:minimize'
  | 'window:maximize'
  | 'window:close'
  | 'window:isMaximized'
  | 'window:maximized'
  | 'window:unmaximized'
  | 'window:enter-full-screen'
  | 'window:leave-full-screen'
  | 'update:checking'
  | 'update:available'
  | 'update:not-available'
  | 'update:error'
  | 'update:download-progress'
  | 'update:downloaded';

// Window state
export interface WindowState {
  isMaximized: boolean;
  isFullScreen: boolean;
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

// Update info
export interface UpdateInfo {
  version: string;
  releaseDate: string;
  releaseNotes?: string;
}

// Download progress
export interface DownloadProgress {
  bytesPerSecond: number;
  percent: number;
  transferred: number;
  total: number;
}

// Main process context
export interface MainProcessContext extends Context {
  window: BrowserWindow | null;
}
