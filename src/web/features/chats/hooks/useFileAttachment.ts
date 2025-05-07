// State
import {
  chatsState$,
  getFilesFromChat,
} from '@/features/chats/state/chatsState';

interface UseFileAttachmentProps {}

/**
 * Hook for managing file attachments in chats - only document files
 */
export function useFileAttachment({}: UseFileAttachmentProps) {
  const currentChatId = chatsState$.currentChatId.get();

  // Early return if no chat id
  if (!currentChatId) {
    return {
      selectedFiles: [],
      documentsAvailable: [],
    };
  }

  const selectedFiles = getFilesFromChat(currentChatId);

  // Filter document files with proper null checks
  const documentsAvailable = selectedFiles.filter((f) => {
    if (!f || !f.file) return false;
    return true; // Accept all file types as documents
  });

  return {
    selectedFiles,
    documentsAvailable,
  };
}
