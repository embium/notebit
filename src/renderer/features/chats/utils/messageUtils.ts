import { v4 as uuidv4 } from 'uuid';
import { Message } from '@src/types/chats';

// Message role enum to use throughout the app
export const MessageRole = {
  User: 'user',
  Assistant: 'assistant',
  System: 'system',
} as const;

export type MessageRoleType = (typeof MessageRole)[keyof typeof MessageRole];

// Function to create a message object
export function createSimpleMessage(
  role: MessageRoleType,
  content: string,
  model?: string
): Message {
  return {
    id: uuidv4(),
    role: role,
    contentParts: [{ type: 'text', text: content }],
    timestamp: Date.now(),
    model: model,
  } as Message;
}

/**
 * Extract text content from message content parts
 */
export function extractTextContent(message: Message): string {
  return message.contentParts
    .filter((part) => part.type === 'text')
    .map((part) => (part as any).text)
    .join('');
}
