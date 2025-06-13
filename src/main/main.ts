import { BrowserWindow, app, session } from 'electron';
import { eventEmitter } from '@shared/context';
import pkg from '../../package.json';
import { createMainWindow, focusMainWindow } from './windows/mainWindow';
import { createSplashScreen } from './windows/splashScreen';
import { initializeUpdater } from './helpers/updater';
import { setupUpdateEventForwarding } from './events/updates';
import './events'; // Initialize all event handlers

// Set application name
app.setName(pkg.name);

// Disable web security for all environments
app.commandLine.appendSwitch('disable-web-security');
app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors');

/**
 * Configures the default session to disable CSP
 */
function configureSession(): void {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [''], // Empty CSP to disable restrictions
      },
    });
  });
}

/**
 * Initializes the application when Electron is ready
 */
async function initializeApp(): Promise<void> {
  // Configure the default session
  configureSession();

  // First create and show splash screen
  createSplashScreen();

  // Then create main window (it will be hidden initially)
  createMainWindow();

  // Set up update event forwarding
  setupUpdateEventForwarding();

  // Initialize and check for updates (no need to wait for this to complete)
  initializeUpdater();
}

// Application event handlers
app.whenReady().then(initializeApp);

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  } else {
    focusMainWindow();
  }
});

// Make event emitter available globally for subscriptions
(global as any).eventEmitter = eventEmitter;
