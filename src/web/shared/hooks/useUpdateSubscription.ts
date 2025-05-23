import { useEffect } from 'react';
import t, { trpcClient, queryClient } from '@shared/config';
import { updateState } from '@/app/state/updateState';
import {
  UpdateProgressEvent,
  UpdateStatusEvent,
} from '@shared/routers/updates';

/**
 * Hook to subscribe to update events from the main process
 * Updates the global Legend State with update status and progress
 */
export function useUpdateSubscription() {
  const utils = t.useUtils();

  useEffect(() => {
    // Subscribe to update events from the main process
    const subscription = utils.client.updates.onUpdateEvents.subscribe(
      undefined,
      {
        onData: (data: UpdateStatusEvent | UpdateProgressEvent) => {
          // Check if it's a status event
          if ('status' in data) {
            const statusEvent = data as UpdateStatusEvent;

            // Update the state based on status
            switch (statusEvent.status) {
              case 'checking':
                updateState.checking.set(true);
                updateState.error.set(null);
                break;
              case 'available':
                updateState.checking.set(false);
                updateState.available.set(true);
                if (statusEvent.info) {
                  updateState.updateInfo.set(statusEvent.info);
                }
                break;
              case 'not-available':
                updateState.checking.set(false);
                updateState.available.set(false);
                break;
              case 'downloading':
                updateState.downloading.set(true);
                break;
              case 'downloaded':
                updateState.downloading.set(false);
                updateState.downloaded.set(true);
                if (statusEvent.info) {
                  updateState.updateInfo.set(statusEvent.info);
                }
                break;
              case 'error':
                updateState.checking.set(false);
                updateState.downloading.set(false);
                updateState.error.set(statusEvent.error || 'Unknown error');
                break;
            }
          }
          // Check if it's a progress event
          else if ('percent' in data) {
            const progressEvent = data as UpdateProgressEvent;
            if (progressEvent.percent < 100) {
              updateState.downloading.set(true);
              updateState.progress.set({
                percent: progressEvent.percent,
                bytesPerSecond: progressEvent.bytesPerSecond,
                total: progressEvent.total,
                transferred: progressEvent.transferred,
              });
            } else {
              updateState.downloading.set(false);
              updateState.downloaded.set(true);
            }
          }
        },
        onError: (err: Error) => {
          console.error('Update subscription error:', err);
          updateState.error.set(err.message);
        },
      }
    );

    // Clean up subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [utils.client.updates.onUpdateEvents]);

  // Function to check for updates manually
  const checkForUpdates = async () => {
    try {
      updateState.checking.set(true);
      await utils.client.updates.checkForUpdates.mutate();
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
      await utils.client.updates.downloadUpdate.mutate();
    } catch (error) {
      console.error('Error downloading update:', error);
      updateState.error.set(String(error));
      updateState.downloading.set(false);
    }
  };

  // Function to install downloaded update
  const installUpdate = async () => {
    try {
      await utils.client.updates.installUpdate.mutate();
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
