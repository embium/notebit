// State
import {
  chatsState$,
  getFilesFromChat,
} from '@/features/chats/state/chatsState';
import { useCallback } from 'react';
import { defaultPromptsState$ } from '../../settings/state/defaultPromptsState';
import { useFileContent } from './useFileContent';

interface FileContent {
  id: string;
  content: string;
}

/**
 * Hook for managing file attachments in chats - only document files
 */
export function useFileAttachment() {
  const currentChatId = chatsState$.currentChatId.get();
  const fileAttachmentsPrompt = defaultPromptsState$.fileAttachments.get();
  const { getFileContents } = useFileContent();

  const selectedFiles = getFilesFromChat(currentChatId);

  // Filter document files with proper null checks
  const documentsAvailable = selectedFiles.filter((f) => {
    if (!f || !f.file) return false;
    return true; // Accept all file types as documents
  });

  const getFileAttachmentContext = useCallback(async (): Promise<string> => {
    console.log(selectedFiles);
    const fileContents = (await getFileContents(
      selectedFiles
    )) as FileContent[];
    if (selectedFiles.length > 0) {
      const contextParts = fileContents
        .map((file) => {
          // Find the original file object
          const fileObj = selectedFiles.find((f) => f.id === file.id)?.file;
          if (!fileObj) {
            console.warn(`File object not found for id: ${file.id}`);
            return `[File: Unknown]\n${file.content}`;
          }

          const fileName = fileObj.name || 'Unknown file';
          const fileType = fileObj.type || 'Unknown type';
          const fileSize = fileObj.size
            ? ` (${Math.round(fileObj.size / 1024)}KB)`
            : '';

          // Format based on file type
          if (fileType.startsWith('text/')) {
            return `[Text File: ${fileName}${fileSize}]\n${file.content}`;
          } else if (fileName.endsWith('.pdf')) {
            return `[PDF Document: ${fileName}${fileSize}]\n${file.content}`;
          } else if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) {
            return `[Word Document: ${fileName}${fileSize}]\n${file.content}`;
          } else {
            return `[File: ${fileName}${fileSize} (${fileType})]\n${file.content}`;
          }
        })
        .join('\n\n');
      return fileAttachmentsPrompt.replace('[FILE_ATTACHMENTS]', contextParts);
    }
    return '';
  }, [selectedFiles]);

  return {
    selectedFiles,
    documentsAvailable,
    getFileAttachmentContext,
  };
}
