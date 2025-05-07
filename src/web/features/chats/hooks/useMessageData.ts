import { useMemo } from 'react';

// Types
import { Message } from '@shared/types/chats';

/**
 * Custom hook for optimizing message data preparation
 * This centralizes and memoizes common operations performed on messages
 */
export function useMessageData(message: Message) {
  // Extract and memoize text content
  const textContent = useMemo(() => {
    return message.contentParts
      .filter((part) => part.type === 'text')
      .map((part) => (part as any).text)
      .join('');
  }, [message.contentParts]);

  // Determine message role information
  const messageRoleInfo = useMemo(() => {
    const isUserMessage = message.role === 'user';
    const displayName = isUserMessage ? 'You' : 'Assistant';
    const roleClass = isUserMessage ? 'user-message' : 'assistant-message';

    return {
      isUserMessage,
      displayName,
      roleClass,
      model: message.model,
    };
  }, [message.role, message.model]);

  return {
    textContent,
    messageRoleInfo,
  };
}
