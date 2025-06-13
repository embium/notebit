import { MutableRefObject } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  FolderSource,
  FileSource,
  SmartHubFileStatus,
  SmartHubFolderStatus,
} from '@src/types/smartHubs';
import { trpcProxyClient } from '@shared/config/index';
import {
  addOrUpdateSmartHubFolder,
  addOrUpdateSmartHubFolderItem,
  getSmartHubById,
} from '../state/smartHubsState';
import { processFile, processFileBatch } from './fileProcessing';

// Define interface for folder items returned from API
interface FolderItemInfo {
  name: string;
  path: string;
  type: 'file' | 'folder';
}

/**
 * Recursively processes a folder and its contents, including nested folders
 * @param folder The folder to process
 * @param smartHubId The ID of the Smart Hub
 * @param abortRef Reference to an abort flag
 * @returns A boolean indicating whether the processing was successful
 */
export const processFolder = async (
  folder: FolderSource,
  smartHubId: string,
  abortRef?: MutableRefObject<boolean>
): Promise<boolean> => {
  try {
    // Update folder status to processing
    updateFolderStatus(folder, smartHubId, 'processing');

    // Check for abort request
    if (abortRef?.current) {
      console.log(`Aborting before processing folder ${folder.path}`);
      return false;
    }

    // Get all items in the folder (including nested items)
    let folderContents: FolderItemInfo[];
    try {
      // Use type assertion to handle potential type mismatch from API
      folderContents =
        (await trpcProxyClient.smartHubs.getFolderItemsRecursive.query({
          path: folder.path,
        })) as FolderItemInfo[];
    } catch (error) {
      console.error(`Error getting items in folder ${folder.path}:`, error);
      updateFolderStatus(folder, smartHubId, 'error');
      return false;
    }

    // Check for abort request after getting folder items
    if (abortRef?.current) {
      console.log(`Aborting after getting folder items for ${folder.path}`);
      return false;
    }

    // Track success/failure of processing
    let hasErrors = false;
    const processedFileCount = { success: 0, error: 0 };

    // Create tracking arrays for files
    const fileItems: FileSource[] = [];

    // First add all files to the folder with processing status
    // This ensures they all appear in the UI immediately
    for (const item of folderContents) {
      if (item.type === 'file') {
        // Create a file object
        const fileId = uuidv4();
        const fileItem: FileSource = {
          id: fileId,
          name: item.name,
          path: item.path,
          fileType: item.name.split('.').pop() || '',
          status: 'processing', // Start with processing status
          type: 'file',
        };

        // Add the file to the folder with processing status
        // This needs to be done individually for each file to ensure they're all visible
        addOrUpdateSmartHubFolderItem(smartHubId, folder.id, fileItem);

        // Add to our tracking array
        fileItems.push(fileItem);
      }
    }

    // Now process each file individually and update their status immediately
    // for (const fileItem of fileItems) {
    //   // Check for abort request
    //   if (abortRef?.current) {
    //     console.log(
    //       `Aborting during file processing for folder ${folder.path}`
    //     );
    //     updateFolderStatus(folder, smartHubId, 'error');
    //     return false;
    //   }

    //   // Process the file (this will update the status in the UI)
    //   const success = await processFile(
    //     fileItem,
    //     smartHubId,
    //     abortRef,
    //     folder.id
    //   );

    //   if (success) {
    //     processedFileCount.success++;
    //   } else {
    //     processedFileCount.error++;
    //     hasErrors = true;
    //   }
    // }

    // Process files in batches
    if (fileItems.length > 0) {
      // Check for abort request
      if (abortRef?.current) {
        console.log(
          `Aborting during file processing for folder ${folder.path}`
        );
        updateFolderStatus(folder, smartHubId, 'error');
        return false;
      }

      // Process the files in batches
      const results = await processFileBatch(
        fileItems,
        smartHubId,
        abortRef,
        folder.id
      );

      processedFileCount.success = results.success;
      processedFileCount.error = results.error;
      hasErrors = results.error > 0;
    }

    // Final folder status based on processing results
    let finalStatus: SmartHubFolderStatus;

    if (abortRef?.current) {
      finalStatus = 'error';
      console.log(`Folder processing aborted for ${folder.path}`);
    } else if (hasErrors) {
      finalStatus = 'error';
      console.log(`Folder processing completed with errors for ${folder.path}`);
    } else {
      finalStatus = 'ready';
      console.log(
        `Folder processing completed successfully for ${folder.path}`
      );
    }

    // Update the folder status
    updateFolderStatus(folder, smartHubId, finalStatus);

    return finalStatus === 'ready';
  } catch (error) {
    console.error(`Unexpected error processing folder ${folder.path}:`, error);
    updateFolderStatus(folder, smartHubId, 'error');
    return false;
  }
};

/**
 * Helper function to update a folder's status in the smart hub state
 */
const updateFolderStatus = (
  folder: FolderSource,
  smartHubId: string,
  status: SmartHubFolderStatus
): void => {
  const updatedFolder = {
    ...folder,
    status,
  };

  // If this is a top-level folder in the smart hub, update it directly
  const smartHub = getSmartHubById(smartHubId);
  if (smartHub && smartHub.folders.some((f) => f.id === folder.id)) {
    addOrUpdateSmartHubFolder(smartHubId, updatedFolder);
    console.log(`Updated folder ${folder.path} status to ${status}`);
  }
};
