import { ipcMain } from 'electron';
import { getAutoUpdater } from '../helpers/updater';
import { getMainWindow } from '../windows/mainWindow';

/**
 * Update-related IPC event handlers
 */

// Handle manual update check
ipcMain.handle('updates:check', async () => {
  try {
    const autoUpdater = getAutoUpdater();
    const result = await autoUpdater.checkForUpdates();
    return {
      updateAvailable: result !== null,
      version: result?.updateInfo?.version,
      releaseNotes: result?.updateInfo?.releaseNotes,
    };
  } catch (error) {
    console.error('Error checking for updates:', error);
    throw error;
  }
});

// Handle update download
ipcMain.handle('updates:download', async () => {
  try {
    const autoUpdater = getAutoUpdater();
    await autoUpdater.downloadUpdate();
    return { success: true };
  } catch (error) {
    console.error('Error downloading update:', error);
    throw error;
  }
});

// Handle update installation
ipcMain.handle('updates:install', () => {
  try {
    const autoUpdater = getAutoUpdater();
    autoUpdater.quitAndInstall();
    return { success: true };
  } catch (error) {
    console.error('Error installing update:', error);
    throw error;
  }
});

// Set up auto-updater event forwarding to renderer
export function setupUpdateEventForwarding(): void {
  const autoUpdater = getAutoUpdater();
  const window = getMainWindow();

  if (!window) return;

  autoUpdater.on('checking-for-update', () => {
    window.webContents.send('update:checking');
  });

  autoUpdater.on('update-available', (info) => {
    window.webContents.send('update:available', info);
  });

  autoUpdater.on('update-not-available', (info) => {
    window.webContents.send('update:not-available', info);
  });

  autoUpdater.on('error', (error) => {
    window.webContents.send('update:error', error.message);
  });

  autoUpdater.on('download-progress', (progressInfo) => {
    window.webContents.send('update:download-progress', progressInfo);
  });

  autoUpdater.on('update-downloaded', (info) => {
    window.webContents.send('update:downloaded', info);
  });
}
