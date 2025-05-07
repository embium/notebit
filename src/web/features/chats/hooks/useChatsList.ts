import { useMemo, useCallback } from 'react';
import { toast } from 'sonner';

// State
import {
  chatsState$,
  openChat,
  createChat,
} from '@/features/chats/state/chatsState';

/**
 * Custom hook for managing the list of chats
 * Handles loading, opening, and sorting chats
 */
export function useChatsList() {
  // Get chat list from global state
  const chatsList = chatsState$.chatsList.get();
  const currentChat = chatsState$.currentChatId.get();

  // Create a new chat
  const handleCreateChat = useCallback(() => {
    try {
      const newChat = createChat();
      return newChat;
    } catch (error) {
      toast.error('Failed to create new chat');
      return null;
    }
  }, []);

  // Open a specific chat
  const handleOpenChat = useCallback((chatId: string) => {
    if (!chatId) return;
    try {
      openChat(chatId);
    } catch (error) {
      console.error('Error opening chat:', error);
    }
  }, []);

  // Sort chats by updated timestamp (latest first)
  // Calling this here causes us to get stuck with a stale state
  const sortedChats = useMemo(() => {
    return [...chatsList]
      .filter((chat) => chat !== undefined)
      .sort((a, b) => {
        if (!a || !b) return 0;
        return (b.updatedAt || 0) - (a.updatedAt || 0);
      });
  }, [chatsList]);

  return {
    chatsList,
    currentChatId: currentChat,
    handleCreateChat,
    handleOpenChat,
    hasChats: sortedChats.length > 0,
  };
}
