import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

// Types
import {
  SmartHub,
  FileSource,
  FolderSource,
} from '@src/shared/types/smartHubs';

// State
import {
  updateSmartHub,
  setSmartHubsStatus,
  getSmartHubById,
  smartHubsState$,
  addOrUpdateSmartHubFolder,
  addOrUpdateSmartHubFolderItem,
} from '@/features/smart-hubs/state/smartHubsState';

// Utils
import { processFile } from '@/features/smart-hubs/utils/fileProcessing';
import { processFolder } from '@/features/smart-hubs/utils/folderProcessing';
import { trpcProxyClient } from '@src/shared/config';
import { processFileBatch } from '@/features/smart-hubs/utils/fileProcessing';
import { aiMemorySettings$ } from '../../settings/state/aiSettings/aiMemorySettings';

interface FolderItemInfo {
  name: string;
  path: string;
  type: 'file' | 'folder';
}

/**
 * Hook for managing Smart Hub composition process
 */
export const useComposition = (smartHubId: string | null) => {
  const abortComposingRef = useRef(false);

  // Get the current Smart Hub from state
  const smartHub = smartHubId
    ? smartHubsState$.smartHubs.get().find((hub) => hub.id === smartHubId)
    : null;

  // Determine if the Smart Hub is currently composing
  const isComposing = smartHub?.status === 'composing';

  // Reset abort state when smart hub changes
  const resetState = useCallback(() => {
    abortComposingRef.current = false;
  }, []);

  /**
   * Force all files and all items in folders to processing status
   * This ensures they will show proper status during recomposition
   */
  const setSmartHubComposing = useCallback(async () => {
    if (!smartHub) return;

    // First set the overall hub status
    setSmartHubsStatus(smartHub.id, 'composing');

    // Create an updated version of the Smart Hub with all files set to processing
    const updatedSmartHub: SmartHub = {
      ...smartHub,
      files: smartHub.files.map((file) => ({
        ...file,
        status: 'processing',
      })),
      folders: await Promise.all(
        smartHub.folders.map(async (folder) => {
          // For each folder, first set its status to processing
          const updatedFolder = {
            ...folder,
            status: 'processing' as const,
          };

          // Update the folder status first so it's immediately visible in the UI
          addOrUpdateSmartHubFolder(smartHub.id, updatedFolder);

          try {
            // Now fetch all items in this folder and add them to the state with processing status
            const folderContents =
              (await trpcProxyClient.smartHubs.getFolderItemsRecursive.query({
                path: folder.path,
              })) as FolderItemInfo[];

            // Process each item and add it to the folder with processing status
            for (const item of folderContents) {
              if (item.type === 'file') {
                // Find if this file already exists in the folder items
                const existingItem = folder.items.find(
                  (folderItem) =>
                    folderItem.type === 'file' && folderItem.path === item.path
                );

                // Create or update the file item
                const fileItem: FileSource = {
                  id: existingItem?.id || uuidv4(),
                  name: item.name,
                  path: item.path,
                  fileType: item.name.split('.').pop() || '',
                  status: 'processing',
                  type: 'file',
                };

                // Add or update the file in the folder
                addOrUpdateSmartHubFolderItem(smartHub.id, folder.id, fileItem);
              }
            }
          } catch (error) {
            console.error(
              `Error getting items for folder ${folder.path}:`,
              error
            );
          }

          // Return the folder with processing status
          return updatedFolder;
        })
      ),
    };

    // Update the Smart Hub in state to reflect all items in processing status
    updateSmartHub(updatedSmartHub);
  }, [smartHub]);

  /**
   * Handles the Smart Hub composition process
   */
  const handleCompose = useCallback(async () => {
    if (!smartHub) return;

    // If already composing, we want to abort
    if (isComposing) {
      abortComposingRef.current = true;
      toast.info('Aborting composition...');
      return;
    }

    // Reset abort flag
    abortComposingRef.current = false;

    // Set all files and folders to processing status
    await setSmartHubComposing();

    try {
      // Process all files
      const fileResults = await processAllFiles(smartHub, abortComposingRef);

      // Check if abort was requested
      if (abortComposingRef.current) {
        setSmartHubsStatus(smartHub.id, 'draft');
        return;
      }

      // Process all folders
      const folderResults = await processAllFolders(
        smartHub,
        abortComposingRef
      );

      // Check if abort was requested
      if (abortComposingRef.current) {
        setSmartHubsStatus(smartHub.id, 'draft');
        return;
      }

      // Get the current state after processing to preserve all statuses
      const currentSmartHub = getSmartHubById(smartHub.id);
      if (!currentSmartHub) {
        setSmartHubsStatus(smartHub.id, 'draft');
        return;
      }

      // Update only the Smart Hub's main status to 'ready'
      const updatedSmartHub: SmartHub = {
        ...currentSmartHub, // Keep all file and folder statuses intact
        status: 'ready',
      };

      updateSmartHub(updatedSmartHub);

      // Show success/error messages
      showCompositionResults(fileResults, folderResults);
    } catch (error) {
      console.error('Error during composition:', error);
      toast.error('An error occurred during composition');
      setSmartHubsStatus(smartHub.id, 'draft');
    }
  }, [isComposing, smartHub, setSmartHubComposing]);

  /**
   * Processes all files in the Smart Hub
   */
  const processAllFiles = async (
    smartHub: SmartHub,
    abortRef: React.MutableRefObject<boolean>
  ) => {
    const filesToProcess = [...smartHub.files];

    // Skip if there are no files to process
    if (filesToProcess.length === 0) {
      return { success: 0, error: 0 };
    }

    // Process all files in batches with the new batch processor
    return await processFileBatch(filesToProcess, smartHub.id, abortRef);
  };

  /**
   * Processes all folders in the Smart Hub
   */
  const processAllFolders = async (
    smartHub: SmartHub,
    abortRef: React.MutableRefObject<boolean>
  ) => {
    const results = { success: 0, error: 0 };
    const foldersToProcess = [...smartHub.folders];

    if (foldersToProcess.length === 0) {
      return results;
    }

    toast.info(`Processing ${foldersToProcess.length} folders...`);

    // Process folders in sequence
    for (const folder of foldersToProcess) {
      // Check for abort request
      if (abortRef.current) {
        toast.info('Folder processing aborted');
        return results;
      }

      const success = await processFolder(folder, smartHub.id, abortRef);
      if (success) {
        results.success++;
      } else {
        results.error++;
      }
    }

    return results;
  };

  /**
   * Shows toast messages with composition results
   */
  const showCompositionResults = (
    fileResults: { success: number; error: number },
    folderResults: { success: number; error: number }
  ) => {
    // Show success message if any items were processed successfully
    if (fileResults.success > 0 || folderResults.success > 0) {
      toast.success(
        `Indexing complete: ${fileResults.success} files and ${folderResults.success} folders processed.`
      );
    }

    // Show error message if any items failed
    if (fileResults.error > 0 || folderResults.error > 0) {
      toast.error(
        `Failed to process ${fileResults.error} files and ${folderResults.error} folders.`
      );
    }
  };

  /**
   * Saves the Smart Hub as a draft
   */
  const handleSaveAsDraft = useCallback(() => {
    if (!smartHub) return;

    // Check if it was already in draft status
    const wasDraft = smartHub.status === 'draft';

    // Update the Smart Hub
    const updatedSmartHub = {
      ...smartHub,
      status: 'draft',
      updatedAt: new Date(),
    };

    updateSmartHub(updatedSmartHub as SmartHub);

    // Show appropriate toast message
    if (wasDraft) {
      toast.success(`${smartHub.name} draft updated`);
    } else {
      toast.success(`${smartHub.name} saved as draft`);
    }
  }, [smartHub]);

  return {
    isComposing,
    abortComposingRef,
    handleCompose,
    handleSaveAsDraft,
    resetState,
  };
};
