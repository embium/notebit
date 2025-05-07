import { useState, useCallback } from 'react';

// State
import { updateChatTitle, Chat } from '@/features/chats/state/chatsState';

/**
 * Custom hook for managing chat editing functionality
 * Handles renaming chats and editing state
 */
export function useChatEditing() {
  // Local state for tracking which chat is being edited
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingChatTitle, setEditingChatTitle] = useState<string>('');

  // Start editing a chat title
  const handleStartEditing = useCallback((chat: Chat) => {
    if (chat?.id) {
      setEditingChatId(chat.id);
      setEditingChatTitle(chat.title || '');
    }
  }, []);

  // Cancel editing
  const handleCancelEditing = useCallback(() => {
    setEditingChatId(null);
  }, []);

  // Save the edited title
  const handleSaveTitle = useCallback((chatId: string, newTitle: string) => {
    try {
      // Use a default title if empty
      updateChatTitle({
        chatId,
        newTitle: newTitle.trim() || 'New Chat',
      });
      setEditingChatId(null);
    } catch (error) {
      console.error('Error renaming chat:', error);
    }
  }, []);

  // Handle title text changes
  const handleTitleChange = useCallback((title: string) => {
    setEditingChatTitle(title);
  }, []);

  // Handle keyboard events in the title input
  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent, chatId: string) => {
      if (e.key === 'Enter') {
        handleSaveTitle(chatId, editingChatTitle);
      } else if (e.key === 'Escape') {
        handleCancelEditing();
      }
    },
    [editingChatTitle, handleSaveTitle, handleCancelEditing]
  );

  return {
    editingChatId,
    editingChatTitle,
    handleStartEditing,
    handleCancelEditing,
    handleSaveTitle,
    handleTitleChange,
    handleKeyPress,
  };
}
