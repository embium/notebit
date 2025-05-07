import { useState, useCallback } from 'react';

// State
import {
  deleteChat,
  clearChat,
  createChat,
  openChat,
} from '@/features/chats/state/chatsState';
import { toast } from 'sonner';

/**
 * Custom hook for managing chat actions
 * Handles deletion and clearing of chats
 */
export function useChatActions() {
  // Dialog states
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const [chatToClear, setChatToClear] = useState<string | null>(null);

  // Initiate chat deletion
  const handleDeleteChat = useCallback((chatId: string) => {
    setChatToDelete(chatId);
    setIsDeleteDialogOpen(true);
  }, []);

  // Confirm and process chat deletion
  const confirmDeleteChat = useCallback(
    (totalChatsCount: number) => {
      if (chatToDelete) {
        // Check if this is the last chat
        const isLastChat = totalChatsCount === 1;
        deleteChat(chatToDelete);

        // If we deleted the last chat, create a new one
        if (isLastChat) {
          const newChat = createChat();
          openChat(newChat.id);
        }
      }

      // Reset state
      setChatToDelete(null);
      setIsDeleteDialogOpen(false);
    },
    [chatToDelete]
  );

  // Cancel chat deletion
  const cancelDeleteChat = useCallback(() => {
    setChatToDelete(null);
    setIsDeleteDialogOpen(false);
  }, []);

  // Initiate chat clearing
  const handleClearChat = useCallback((chatId: string) => {
    setChatToClear(chatId);
    setIsClearDialogOpen(true);
  }, []);

  // Confirm and process chat clearing
  const confirmClearChat = useCallback(() => {
    if (chatToClear) {
      try {
        clearChat(chatToClear);
      } catch (error) {
        toast.error('Failed to clear chat messages');
      }
    }

    // Reset state
    setChatToClear(null);
    setIsClearDialogOpen(false);
  }, [chatToClear]);

  // Cancel chat clearing
  const cancelClearChat = useCallback(() => {
    setChatToClear(null);
    setIsClearDialogOpen(false);
  }, []);

  return {
    // Delete related
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    chatToDelete,
    handleDeleteChat,
    confirmDeleteChat,
    cancelDeleteChat,

    // Clear related
    isClearDialogOpen,
    setIsClearDialogOpen,
    chatToClear,
    handleClearChat,
    confirmClearChat,
    cancelClearChat,
  };
}
