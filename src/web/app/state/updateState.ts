import { observable } from '@legendapp/state';
import { UpdateInfo } from 'electron-updater';

export interface UpdateStatus {
  checking: boolean;
  available: boolean;
  downloading: boolean;
  downloaded: boolean;
  error: string | null;
  updateInfo: UpdateInfo | null;
  progress: {
    percent: number;
    bytesPerSecond: number;
    total: number;
    transferred: number;
  } | null;
}

/**
 * Global observable for application updates
 * Tracks update status, progress, and available update info
 */
export const updateState = observable<UpdateStatus>({
  checking: false,
  available: false,
  downloading: false,
  downloaded: false,
  error: null,
  updateInfo: null,
  progress: null,
});
