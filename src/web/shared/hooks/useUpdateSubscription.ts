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
          // All events now have a status field
          const eventStatus = data.status;

          switch (eventStatus) {
            case 'checking':
              updateState.checking.set(true);
              updateState.error.set(null);
              break;
            case 'available':
              updateState.checking.set(false);
              updateState.available.set(true);
              if ('info' in data && data.info) {
                updateState.updateInfo.set(data.info);
              }
              break;
            case 'not-available':
              updateState.checking.set(false);
              updateState.available.set(false);
              break;
            case 'downloading':
              updateState.downloading.set(true);

              // Check if it's a progress event with percent data
              if ('percent' in data) {
                updateState.progress.set({
                  percent: data.percent,
                  bytesPerSecond: data.bytesPerSecond,
                  total: data.total,
                  transferred: data.transferred,
                });

                // If download is complete, update status
                if (data.percent >= 100) {
                  updateState.downloading.set(false);
                  updateState.downloaded.set(true);
                }
              }
              break;
            case 'downloaded':
              updateState.downloading.set(false);
              updateState.downloaded.set(true);
              if ('info' in data && data.info) {
                updateState.updateInfo.set(data.info);
              }
              break;
            case 'error':
              updateState.checking.set(false);
              updateState.downloading.set(false);
              if ('error' in data) {
                updateState.error.set(data.error || 'Unknown error');
              } else {
                updateState.error.set('Unknown error');
              }
              break;
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
