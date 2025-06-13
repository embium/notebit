import { BrowserWindow } from 'electron';
import { join } from 'node:path';

let splashScreen: BrowserWindow | null = null;

/**
 * Creates and shows a splash screen
 */
export const createSplashScreen = (): BrowserWindow => {
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
    splashScreen.loadFile(join(__dirname, '../../src/renderer/splash.html'));
  } else {
    splashScreen.loadFile(join(__dirname, '../../renderer/splash.html'));
  }

  splashScreen.center();
  splashScreen.show();

  return splashScreen;
};

/**
 * Closes the splash screen if it exists
 */
export const closeSplashScreen = (): void => {
  if (splashScreen && !splashScreen.isDestroyed()) {
    splashScreen.close();
    splashScreen = null;
  }
};

/**
 * Gets the current splash screen instance
 */
export const getSplashScreen = (): BrowserWindow | null => {
  return splashScreen;
};
