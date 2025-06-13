import { BrowserWindow, shell } from 'electron';
import { join } from 'node:path';
import { createIPCHandler } from 'electron-trpc/main';
import { mainAppRouter } from '../../shared/routers/_app';
import { createContext } from '../../shared/context';
import { closeSplashScreen } from './splashScreen';
import { setupWindowStateListeners } from '../events/window';

let mainWindow: BrowserWindow | null = null;

/**
 * Creates the main application window
 */
export const createMainWindow = (): BrowserWindow => {
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
      preload: join(__dirname, '../preload/index.js'),
      webSecurity: false, // Disable web security
      allowRunningInsecureContent: false, // Allow loading insecure content
    },
    autoHideMenuBar: true,
  });

  // Set up IPC handler
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
      closeSplashScreen();

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

  // Load the appropriate URL based on environment
  if (import.meta.env.DEV) {
    mainWindow.loadURL('http://localhost:5173');
    // Don't open DevTools immediately to avoid showing over splash screen
    // Open it after window is shown
    mainWindow.once('show', () => {
      mainWindow?.webContents.openDevTools({ mode: 'right' });
    });
  } else {
    mainWindow.loadFile(join(__dirname, '../../renderer/index.html'));
  }

  // Clean up reference on close
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Set up window state event listeners
  setupWindowStateListeners(mainWindow);

  // Return the window instance for use elsewhere
  return mainWindow;
};

/**
 * Gets the current main window instance
 */
export const getMainWindow = (): BrowserWindow | null => {
  return mainWindow;
};

/**
 * Focuses the main window if it exists
 */
export const focusMainWindow = (): void => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
  }
};
