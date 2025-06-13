import { useEffect } from 'react';
import { updateState } from '@/app/state/updateState';
import type { UpdateInfo } from 'electron-updater';

interface UpdateProgress {
  percent: number;
  bytesPerSecond: number;
  total: number;
  transferred: number;
}

/**
 * Hook to subscribe to update events from the main process
 * Updates the global Legend State with update status and progress
 */
export function useUpdateSubscription() {
  useEffect(() => {
    // Subscribe to update events from the main process
    const unsubscribers: Array<() => void> = [];

    // Checking for updates
    unsubscribers.push(
      window.electronAPI.system.onUpdateChecking(() => {
        updateState.checking.set(true);
        updateState.error.set(null);
      })
    );

    // Update available
    unsubscribers.push(
      window.electronAPI.system.onUpdateAvailable((info: UpdateInfo) => {
        updateState.checking.set(false);
        updateState.available.set(true);
        if (info) {
          updateState.updateInfo.set(info);
        }
      })
    );

    // Update not available
    unsubscribers.push(
      window.electronAPI.system.onUpdateNotAvailable(() => {
        updateState.checking.set(false);
        updateState.available.set(false);
      })
    );

    // Download progress
    unsubscribers.push(
      window.electronAPI.system.onUpdateDownloadProgress(
        (progress: UpdateProgress) => {
          updateState.downloading.set(true);
          if (progress) {
            updateState.progress.set({
              percent: progress.percent,
              bytesPerSecond: progress.bytesPerSecond,
              total: progress.total,
              transferred: progress.transferred,
            });

            // If download is complete, update status
            if (progress.percent >= 100) {
              updateState.downloading.set(false);
              updateState.downloaded.set(true);
            }
          }
        }
      )
    );

    // Update downloaded
    unsubscribers.push(
      window.electronAPI.system.onUpdateDownloaded((info: UpdateInfo) => {
        updateState.downloading.set(false);
        updateState.downloaded.set(true);
        if (info) {
          updateState.updateInfo.set(info);
        }
      })
    );

    // Update error
    unsubscribers.push(
      window.electronAPI.system.onUpdateError((error: string) => {
        updateState.checking.set(false);
        updateState.downloading.set(false);
        updateState.error.set(error || 'Unknown error');
      })
    );

    // Clean up subscriptions on unmount
    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, []);

  // Function to check for updates manually
  const checkForUpdates = async () => {
    try {
      updateState.checking.set(true);
      const result = await window.electronAPI.system.checkForUpdates();
      if (result && !result.updateAvailable) {
        updateState.checking.set(false);
        updateState.available.set(false);
      }
      // Other states will be handled by event listeners
    } catch (error) {
      console.error('Error checking for updates:', error);
      updateState.error.set(String(error));
      updateState.checking.set(false);
    }
  };

  // Function to download available update
  const downloadUpdate = async () => {
    try {
      updateState.downloading.set(true);
      await window.electronAPI.system.downloadUpdate();
      // Download progress and completion will be handled by event listeners
    } catch (error) {
      console.error('Error downloading update:', error);
      updateState.error.set(String(error));
      updateState.downloading.set(false);
    }
  };

  // Function to install downloaded update
  const installUpdate = async () => {
    try {
      await window.electronAPI.system.installUpdate();
      // App will quit and restart
    } catch (error) {
      console.error('Error installing update:', error);
      updateState.error.set(String(error));
    }
  };

  return {
    checkForUpdates,
    downloadUpdate,
    installUpdate,
  };
}
