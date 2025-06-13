import { useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';

// TRPC
import { trpcProxyClient } from '@shared/config/index';

// Types
import { FileSource, SmartHub } from '@src/types/smartHubs';

// State
import {
  smartHubsState$,
  updateSmartHub,
} from '@/features/smart-hubs/state/smartHubsState';

// Utils
import { supportedTextFileTypes } from '@src/types/supportedFiles';

// Add an interface for the file info returned from the main process
interface FileInfo {
  path: string;
  name: string;
  fileType: string;
  size: number;
}

/**
 * Hook for managing Smart Hub files
 */
export const useSmartHubFiles = (smartHubId: string | null) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const smartHub = smartHubsState$.smartHubs
    .get()
    .find((p) => p.id === smartHubId);

  /**
   * Handles browsing and selecting files for the Smart Hub
   */
  const handleBrowseFiles = useCallback(async () => {
    if (!smartHub) return;

    try {
      const selectedFiles = await trpcProxyClient.smartHubs.selectFiles.mutate({
        title: 'Select Files for Smart Hub',
      });

      if (selectedFiles.length > 0) {
        // Create new file sources for each selected file
        const newFiles: FileSource[] = selectedFiles.map(
          (fileInfo: FileInfo) => ({
            id: uuidv4(),
            type: 'file',
            name: fileInfo.name,
            path: fileInfo.path,
            size: fileInfo.size,
            fileType: fileInfo.fileType,
            status: 'pending',
          })
        );

        // Create updated Smart Hub with new files
        const updatedSmartHub = {
          ...smartHub,
          files: [...smartHub.files, ...newFiles],
          updatedAt: new Date(),
        };

        // Update the Smart Hub in the state
        updateSmartHub(updatedSmartHub);
        toast.success(`Added ${newFiles.length} file(s) to ${smartHub.name}`);
      }
    } catch (error) {
      console.error('Error selecting files:', error);
      toast.error('Failed to select files');
    }
  }, [smartHub]);

  /**
   * Handles file input change (from browser file picker)
   */
  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!smartHub) return;

      const files = event.target.files;
      if (!files || files.length === 0) return;

      const newFiles = Array.from(files).map((file) => {
        const fileType = file.name.split('.').pop() || '';

        return {
          id: uuidv4(),
          type: 'file' as const,
          name: file.name,
          path: '', // Since we're using the file input, we don't have the file path
          size: file.size,
          fileType: fileType.toLowerCase(),
          status: 'pending' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      });

      // Create updated Smart Hub with new files
      const updatedSmartHub = {
        ...smartHub,
        files: [...smartHub.files, ...newFiles],
        updatedAt: new Date(),
      };

      // Update the Smart Hub in the state
      updateSmartHub(updatedSmartHub);
      toast.success(`Added ${newFiles.length} file(s) to ${smartHub.name}`);

      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [smartHub]
  );

  return {
    handleBrowseFiles,
    handleFileChange,
    fileInputRef,
    supportedTextFileTypes,
  };
};
