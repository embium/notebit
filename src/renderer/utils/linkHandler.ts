/**
 * Utility functions for handling links in the application
 */

import { generalSettingsState$ } from '@/features/settings/state/generalSettingsState';

/**
 * Opens a URL in the default external browser
 * This is the preferred way to open links from the app
 *
 * @param url - The URL to open
 * @returns void
 */
export function openExternalLink(url: string): void {
  if (!url || url.startsWith('javascript:')) {
    return;
  }

  // Use window.open for the renderer process
  // The main process will intercept this and handle it through shell.openExternal
  generalSettingsState$.enableLinks.get() && window.open(url, '_blank');
}
