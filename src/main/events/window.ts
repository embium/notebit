import { ipcMain, BrowserWindow } from 'electron';
import { getMainWindow } from '../windows/mainWindow';

/**
 * Window-related IPC event handlers
 */

// Handle window minimize
ipcMain.on('window:minimize', () => {
  const window = getMainWindow();
  if (window && !window.isDestroyed()) {
    window.minimize();
  }
});

// Handle window maximize/restore
ipcMain.on('window:maximize', () => {
  const window = getMainWindow();
  if (window && !window.isDestroyed()) {
    if (window.isMaximized()) {
      window.restore();
    } else {
      window.maximize();
    }
  }
});

// Handle window close
ipcMain.on('window:close', () => {
  const window = getMainWindow();
  if (window && !window.isDestroyed()) {
    window.close();
  }
});

// Handle window state queries
ipcMain.handle('window:isMaximized', () => {
  const window = getMainWindow();
  return window && !window.isDestroyed() ? window.isMaximized() : false;
});

// Handle window state changes
export function setupWindowStateListeners(window: BrowserWindow): void {
  window.on('maximize', () => {
    window.webContents.send('window:maximized');
  });

  window.on('unmaximize', () => {
    window.webContents.send('window:unmaximized');
  });

  window.on('enter-full-screen', () => {
    window.webContents.send('window:enter-full-screen');
  });

  window.on('leave-full-screen', () => {
    window.webContents.send('window:leave-full-screen');
  });
}
