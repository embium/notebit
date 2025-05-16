import { createContext } from '@shared/context';
import { mainAppRouter } from './shared/routers/_app';
import { BrowserWindow, app, session, shell, dialog } from 'electron';
import { createIPCHandler } from 'electron-trpc/main';
import { join } from 'node:path';
import pkg from '../package.json';
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
});

app.once('window-all-closed', () => app.quit());
