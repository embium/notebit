import { router, publicProcedure } from '@shared/trpc';
import { observable } from '@trpc/server/observable';
import { z } from 'zod';
import { getAutoUpdater } from '../../main';
import { UpdateInfo, ProgressInfo } from 'electron-updater';

// Define update progress event types
export interface UpdateProgressEvent {
  bytesPerSecond: number;
  percent: number;
  total: number;
  transferred: number;
}

export interface UpdateStatusEvent {
  status:
    | 'checking'
    | 'available'
    | 'not-available'
    | 'downloading'
    | 'downloaded'
    | 'error';
  info?: UpdateInfo;
  error?: string;
}

/**
 * TRPC router for application update operations
 * Provides procedures to check for updates and subscribe to update events
 */
export const updatesRouter = router({
  /**
   * Checks for updates manually
   */
  checkForUpdates: publicProcedure.mutation(async () => {
    const autoUpdater = getAutoUpdater();
    try {
      const result = await autoUpdater.checkForUpdates();
      return { success: true, updateInfo: result?.updateInfo };
    } catch (error) {
      console.error('Error checking for updates:', error);
      return { success: false, error: String(error) };
    }
  }),

  /**
   * Downloads an available update
   */
  downloadUpdate: publicProcedure.mutation(async () => {
    const autoUpdater = getAutoUpdater();
    try {
      await autoUpdater.downloadUpdate();
      return { success: true };
    } catch (error) {
      console.error('Error downloading update:', error);
      return { success: false, error: String(error) };
    }
  }),

  /**
   * Installs a downloaded update
   */
  installUpdate: publicProcedure.mutation(async () => {
    const autoUpdater = getAutoUpdater();
    try {
      autoUpdater.quitAndInstall(false, true);
      return { success: true };
    } catch (error) {
      console.error('Error installing update:', error);
      return { success: false, error: String(error) };
    }
  }),

  /**
   * Subscribes to update status and progress events
   */
  onUpdateEvents: publicProcedure.subscription(() => {
    return observable<UpdateStatusEvent | UpdateProgressEvent>((emit) => {
      const autoUpdater = getAutoUpdater();

      // Status event handlers
      const onCheckingForUpdate = () => emit.next({ status: 'checking' });
      const onUpdateAvailable = (info: UpdateInfo) =>
        emit.next({ status: 'available', info });
      const onUpdateNotAvailable = (info: UpdateInfo) =>
        emit.next({ status: 'not-available', info });
      const onError = (error: Error) =>
        emit.next({ status: 'error', error: error.message });
      const onDownloadProgress = (progressObj: ProgressInfo) => {
        emit.next({
          bytesPerSecond: progressObj.bytesPerSecond,
          percent: progressObj.percent,
          total: progressObj.total,
          transferred: progressObj.transferred,
        });
      };
      const onUpdateDownloaded = (info: UpdateInfo) =>
        emit.next({ status: 'downloaded', info });

      // Attach event listeners
      autoUpdater.on('checking-for-update', onCheckingForUpdate);
      autoUpdater.on('update-available', onUpdateAvailable);
      autoUpdater.on('update-not-available', onUpdateNotAvailable);
      autoUpdater.on('error', onError);
      autoUpdater.on('download-progress', onDownloadProgress);
      autoUpdater.on('update-downloaded', onUpdateDownloaded);

      // Return cleanup function to remove listeners when subscription ends
      return () => {
        autoUpdater.removeListener('checking-for-update', onCheckingForUpdate);
        autoUpdater.removeListener('update-available', onUpdateAvailable);
        autoUpdater.removeListener(
          'update-not-available',
          onUpdateNotAvailable
        );
        autoUpdater.removeListener('error', onError);
        autoUpdater.removeListener('download-progress', onDownloadProgress);
        autoUpdater.removeListener('update-downloaded', onUpdateDownloaded);
      };
    });
  }),
});
