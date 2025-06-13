import electronUpdater, { AppUpdater } from 'electron-updater';

/**
 * Configures and returns the autoUpdater instance
 * Sets up event listeners for update events
 */
export function getAutoUpdater(): AppUpdater {
  // Using destructuring to access autoUpdater due to the CommonJS module of 'electron-updater'.
  // It is a workaround for ESM compatibility issues, see https://github.com/electron-userland/electron-builder/issues/7976.
  const { autoUpdater } = electronUpdater;
  autoUpdater.forceDevUpdateConfig = true;
  autoUpdater.disableDifferentialDownload = true;
  autoUpdater.disableWebInstaller = true;

  // Log update events to console
  autoUpdater.logger = console;

  return autoUpdater;
}

/**
 * Initializes the auto-updater and checks for updates
 */
export function initializeUpdater(): void {
  const autoUpdater = getAutoUpdater();

  // Set up event listeners
  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for update...');
  });

  autoUpdater.on('update-available', (info) => {
    console.log('Update available:', info);
  });

  autoUpdater.on('update-not-available', (info) => {
    console.log('Update not available:', info);
  });

  autoUpdater.on('error', (err) => {
    console.error('Error in auto-updater:', err);
  });

  autoUpdater.on('download-progress', (progressObj) => {
    let logMessage = `Download speed: ${progressObj.bytesPerSecond}`;
    logMessage = `${logMessage} - Downloaded ${progressObj.percent}%`;
    logMessage = `${logMessage} (${progressObj.transferred}/${progressObj.total})`;
    console.log(logMessage);
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('Update downloaded:', info);
  });

  // Check for updates
  autoUpdater.checkForUpdatesAndNotify().catch((error) => {
    console.error('Failed to check for updates:', error);
  });
}
