import { createContext } from '@shared/context';
import { mainAppRouter } from './shared/routers/_app';
import { BrowserWindow, app, session, shell, dialog } from 'electron';
import { createIPCHandler } from 'electron-trpc/main';
import { join } from 'node:path';
import pkg from '../package.json';
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

  // Configure autoUpdater events if not already done
  if (!autoUpdater.listenerCount('download-progress')) {
    // Handle update events
    autoUpdater.on('error', (error) => {
      console.error('Update error:', error);
    });

    autoUpdater.on('checking-for-update', () => {
      console.log('Checking for updates...');
    });

    autoUpdater.on('update-available', (info) => {
      console.log('Update available:', info);
    });

    autoUpdater.on('update-not-available', (info) => {
      console.log('No updates available:', info);
    });

    autoUpdater.on('download-progress', (progressObj) => {
      const logMessage = `Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}% (${progressObj.transferred}/${progressObj.total})`;
      console.log(logMessage);
    });

    autoUpdater.on('update-downloaded', (info) => {
      console.log('Update downloaded:', info);
    });
  }

  return autoUpdater;
}

app.setName(pkg.name);

// Disable web security for all environments
app.commandLine.appendSwitch('disable-web-security');
app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors');

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    frame: false,
    webPreferences: {
      sandbox: false,
      preload: join(__dirname, '../preload/preload.js'),
      webSecurity: false, // Disable web security
      allowRunningInsecureContent: false, // Allow loading insecure content
    },
    autoHideMenuBar: true,
  });

  createIPCHandler({
    router: mainAppRouter,
    windows: [mainWindow],
    createContext,
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Open external URLs in the default browser
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Handle normal link clicks
  mainWindow.webContents.on('will-navigate', (event, url) => {
    // Prevent navigation within the app for external URLs
    if (!url.startsWith('file://') && !url.startsWith('http://localhost')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.webContents.on('dom-ready', () => {
    mainWindow.show;
  });

  // Disable CSP by setting it to an empty value for all environments
  mainWindow.webContents.session.webRequest.onHeadersReceived(
    (details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [''], // Empty CSP to disable restrictions
        },
      });
    }
  );

  if (import.meta.env.DEV) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'right' });
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  // Return the window instance for use elsewhere
  return mainWindow;
};

app.whenReady().then(async () => {
  // Configure the default session to disable CSP as well
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [''], // Empty CSP to disable restrictions
      },
    });
  });

  // Create window immediately
  createWindow();

  // Initialize and check for updates (no need to wait for this to complete)
  getAutoUpdater().checkForUpdatesAndNotify();
});

app.once('window-all-closed', () => app.quit());
