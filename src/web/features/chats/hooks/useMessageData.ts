import { useMemo } from 'react';

// Types
import { Message } from '@shared/types/chats';

/**
 * Custom hook for optimizing message data preparation
 * This centralizes and memoizes common operations performed on messages
 */
export function useMessageData(message: Message) {
  // Extract and memoize text content with reasoning sections identified
  const { textContent, reasoningSections } = useMemo(() => {
    const fullText = message.contentParts
      .filter((part) => part.type === 'text')
      .map((part) => (part as any).text)
      .join('');

    // Find all reasoning sections wrapped in <think> tags
    // Using a regex that can handle streaming partial content
    // This regex works even if the </think> tag is not yet present
    const reasoningRegex = /<think>([\s\S]*?)(?:<\/think>|$)/g;
    const reasoningSections: {
      content: string;
      index: number;
      isComplete: boolean;
    }[] = [];

    // Replace reasoning sections with markers and collect them
    const processedText = fullText.replace(
      reasoningRegex,
      (match, reasoningContent, offset) => {
        const isComplete = match.endsWith('</think>');
        const placeholderId = `__REASONING_${reasoningSections.length}__`;
        reasoningSections.push({
          content: reasoningContent.trim(),
          index: reasoningSections.length,
          isComplete,
        });
        return placeholderId;
      }
    );

    return { textContent: processedText, reasoningSections };
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
    reasoningSections,
    messageRoleInfo,
  };
}
