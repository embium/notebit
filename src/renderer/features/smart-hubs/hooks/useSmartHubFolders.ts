import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';

// Config
import { trpcProxyClient } from '@shared/config/index';

// Types
import { FolderSource } from '@src/types/smartHubs';

// State
import {
  smartHubsState$,
  updateSmartHub,
} from '@/features/smart-hubs/state/smartHubsState';

/**
 * Hook for managing Smart Hub folders
 */
export const useSmartHubFolders = (smartHubId: string | null) => {
  const smartHub = smartHubsState$.smartHubs
    .get()
    .find((p) => p.id === smartHubId);

  /**
   * Handles browsing and selecting folders for the Smart Hub
   */
  const handleBrowseFolders = useCallback(async () => {
    if (!smartHub) return;

    try {
      const selectedFolder =
        await trpcProxyClient.smartHubs.selectFolder.mutate({
          title: 'Select Folder for Smart Hub',
        });

      if (selectedFolder) {
        // Create a new folder source
        const newFolder: FolderSource = {
          id: uuidv4(),
          type: 'folder',
          path: selectedFolder,
          status: 'pending',
          items: [],
        };

        // Create updated Smart Hub with new folder
        const updatedSmartHub = {
          ...smartHub,
          folders: [...smartHub.folders, newFolder],
          updatedAt: new Date(),
        };

        // Update the Smart Hub in the state
        updateSmartHub(updatedSmartHub);
        toast.success(`Added folder to ${smartHub.name}`);
      }
    } catch (error) {
      console.error('Error selecting folder:', error);
      toast.error('Failed to select folder');
    }
  }, [smartHub]);

  return {
    handleBrowseFolders,
  };
};
