import { ipcRenderer } from 'electron';

/**
 * Window-related APIs exposed to the renderer process
 */
export const windowApi = {
  /**
   * Minimize the current window
   */
  minimize: () => ipcRenderer.send('window:minimize'),

  /**
   * Maximize or restore the current window
   */
  maximize: () => ipcRenderer.send('window:maximize'),

  /**
   * Close the current window
   */
  close: () => ipcRenderer.send('window:close'),

  /**
   * Check if the window is maximized
   */
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),

  /**
   * Listen for window state changes
   */
  onMaximized: (callback: () => void) => {
    ipcRenderer.on('window:maximized', callback);
    return () => ipcRenderer.removeListener('window:maximized', callback);
  },

  onUnmaximized: (callback: () => void) => {
    ipcRenderer.on('window:unmaximized', callback);
    return () => ipcRenderer.removeListener('window:unmaximized', callback);
  },

  onEnterFullScreen: (callback: () => void) => {
    ipcRenderer.on('window:enter-full-screen', callback);
    return () =>
      ipcRenderer.removeListener('window:enter-full-screen', callback);
  },

  onLeaveFullScreen: (callback: () => void) => {
    ipcRenderer.on('window:leave-full-screen', callback);
    return () =>
      ipcRenderer.removeListener('window:leave-full-screen', callback);
  },
};
