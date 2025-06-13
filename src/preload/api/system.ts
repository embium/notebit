import { ipcRenderer } from 'electron';
import { platform, release, arch, version } from 'os';

/**
 * System-related APIs exposed to the renderer process
 */
export const systemApi = {
  /**
   * Get platform information
   */
  getPlatform: () => platform(),

  /**
   * Get OS release
   */
  getRelease: () => release(),

  /**
   * Get system architecture
   */
  getArch: () => arch(),

  /**
   * Get Node.js version
   */
  getNodeVersion: () => version(),

  /**
   * Get app version
   */
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),

  /**
   * Open external URL in default browser
   */
  openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),

  /**
   * Show item in folder
   */
  showItemInFolder: (path: string) =>
    ipcRenderer.invoke('shell:showItemInFolder', path),

  /**
   * Open path in default application
   */
  openPath: (path: string) => ipcRenderer.invoke('shell:openPath', path),

  /**
   * Check for updates
   */
  checkForUpdates: () => ipcRenderer.invoke('updates:check'),

  /**
   * Download update
   */
  downloadUpdate: () => ipcRenderer.invoke('updates:download'),

  /**
   * Install update and restart
   */
  installUpdate: () => ipcRenderer.invoke('updates:install'),

  /**
   * Listen for update events
   */
  onUpdateChecking: (callback: () => void) => {
    ipcRenderer.on('update:checking', callback);
    return () => ipcRenderer.removeListener('update:checking', callback);
  },

  onUpdateAvailable: (callback: (info: any) => void) => {
    ipcRenderer.on('update:available', (_, info) => callback(info));
    return () => ipcRenderer.removeListener('update:available', callback);
  },

  onUpdateNotAvailable: (callback: (info: any) => void) => {
    ipcRenderer.on('update:not-available', (_, info) => callback(info));
    return () => ipcRenderer.removeListener('update:not-available', callback);
  },

  onUpdateError: (callback: (error: string) => void) => {
    const handler = (_: any, error: string) => callback(error);
    ipcRenderer.on('update:error', handler);
    return () => ipcRenderer.removeListener('update:error', handler);
  },

  onUpdateDownloadProgress: (callback: (progress: any) => void) => {
    ipcRenderer.on('update:download-progress', (_, progress) =>
      callback(progress)
    );
    return () =>
      ipcRenderer.removeListener('update:download-progress', callback);
  },

  onUpdateDownloaded: (callback: (info: any) => void) => {
    ipcRenderer.on('update:downloaded', (_, info) => callback(info));
    return () => ipcRenderer.removeListener('update:downloaded', callback);
  },
};
