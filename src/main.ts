import { createContext, eventEmitter } from '@shared/context';
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

  return autoUpdater;
}

app.setName(pkg.name);

// Disable web security for all environments
app.commandLine.appendSwitch('disable-web-security');
app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors');

// Global references to windows to prevent garbage collection
let mainWindow: BrowserWindow | null = null;
let splashScreen: BrowserWindow | null = null;

/**
 * Creates and shows a splash screen
 */
const createSplashScreen = () => {
  // Create a splash screen
  splashScreen = new BrowserWindow({
    width: 400,
    height: 400,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      devTools: import.meta.env.DEV,
    },
  });

  // Load the splash screen HTML
  if (import.meta.env.DEV) {
    splashScreen.loadFile(join(__dirname, '../../src/web/splash.html'));
  } else {
    splashScreen.loadFile(join(__dirname, '../renderer/splash.html'));
  }

  splashScreen.center();
  splashScreen.show();

  return splashScreen;
};

/**
 * Creates the main application window
 */
const createWindow = () => {
  // Create main application window
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    frame: false,
    show: false, // Don't show the window until it's ready
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

  // When the main window is ready to show, close the splash screen and show the main window
  mainWindow.once('ready-to-show', () => {
    // Add a slight delay to make the transition smoother
    setTimeout(() => {
      if (splashScreen && !splashScreen.isDestroyed()) {
        splashScreen.close();
        splashScreen = null;
      }

      if (mainWindow) {
        mainWindow.show();
      }
    }, 1000);
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
    // Don't open DevTools immediately to avoid showing over splash screen
    // Open it after window is shown
    mainWindow.once('show', () => {
      mainWindow?.webContents.openDevTools({ mode: 'right' });
    });
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

  // First create and show splash screen
  createSplashScreen();

  // Then create main window (it will be hidden initially)
  createWindow();

  // Initialize and check for updates (no need to wait for this to complete)
  getAutoUpdater().checkForUpdatesAndNotify();
});

app.on('window-all-closed', () => app.quit());

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Make event emitter available globally for subscriptions
(global as any).eventEmitter = eventEmitter;
