import { useState, useCallback } from 'react';

// TRPC
import { trpcProxyClient } from '@shared/config/index';

// Types
import { FileWithPreview } from '@src/types/common';

interface UseFileContentResult {
  isLoading: boolean;
  error: string | null;
  getFileContents: (
    files: FileWithPreview[]
  ) => Promise<{ id: string; content: string }[]>;
}

/**
 * Hook for loading file contents for AI messages
 */
export function useFileContent(): UseFileContentResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Get content for each file that is selected
   */
  const getFileContents = useCallback(async (files: FileWithPreview[]) => {
    if (!files.length) {
      console.log('No files to process');
      return [];
    }

    setIsLoading(true);
    setError(null);

    try {
      // Only process files where selected is strictly true
      const selectedFiles = files.filter((file) => file.selected === true);
      console.log(
        `Processing ${selectedFiles.length} selected files out of ${files.length} total files`
      );

      if (selectedFiles.length === 0) {
        console.log('No files were selected, skipping file content processing');
        setIsLoading(false);
        return [];
      }

      // Process files in parallel
      const fileContentsPromises = selectedFiles.map(async (file) => {
        if (!file.file) {
          console.error('File object is missing in FileWithPreview');
          return {
            id: file.id,
            content: 'Error: File object is missing',
          };
        }

        // Determine if file should be loaded as text
        const fileName = file.file.name || '';
        const fileType = file.file.type || '';

        try {
          // Create a file path from the file object
          // Note: In Electron, file.file.path might be available for selected files
          const filePath = (file.file as any).path;

          if (!filePath) {
            console.error(`No file path available for ${fileName}`);
            return {
              id: file.id,
              content: `Error: Could not access file path for ${fileName}`,
            };
          }

          console.log(`Loading file: ${fileName}`);

          // Load file content through TRPC (handles transferring between main and renderer processes)
          const content =
            await trpcProxyClient.fileAttachments.getFileContent.query({
              path: filePath,
              fileName: fileName,
            });

          return {
            id: file.id,
            content: content,
          };
        } catch (err) {
          console.error(`Error loading file ${fileName}:`, err);
          return {
            id: file.id,
            content: `Error loading file: ${fileName}`,
          };
        }
      });

      const fileContents = await Promise.all(fileContentsPromises);
      console.log(`Successfully loaded ${fileContents.length} file contents`);
      setIsLoading(false);
      return fileContents;
    } catch (error) {
      console.error('Error loading file contents:', error);
      setError('Failed to load file contents');
      setIsLoading(false);
      return [];
    }
  }, []);

  return {
    isLoading,
    error,
    getFileContents,
  };
}
