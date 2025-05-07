/**
 * Chats feature state management with Legend State
 */
import { observable, computed, batch } from '@legendapp/state';
import { persistObservable } from '@legendapp/state/persist';
import { v4 as uuidv4 } from 'uuid';

// Types
import { Message } from '@shared/types/chats';

// Define similarity threshold levels as string literals
export type SimilarityThresholdLevel = 'low' | 'medium' | 'high' | 'highest';

// Define the mapping between levels and numeric values
export const SIMILARITY_THRESHOLD_VALUES: Record<
  SimilarityThresholdLevel,
  number
> = {
  low: 0.1,
  medium: 0.25,
  high: 0.5,
  highest: 0.75,
};

// Default threshold level
export const DEFAULT_SIMILARITY_THRESHOLD: SimilarityThresholdLevel = 'medium';
export const DEFAULT_CHUNKS_COUNT = 10;

// Utility function to get numeric value from level
export function getSimilarityValue(level: SimilarityThresholdLevel): number {
  return SIMILARITY_THRESHOLD_VALUES[level];
}

// Types for the chats state
export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  files?: FileWithPreview[];
  smartHubSimilarityThreshold: SimilarityThresholdLevel;
  smartHubChunks: number;
  createdAt: number;
  updatedAt: number;
}

export interface chatsState$ {
  chatsList: Chat[];
  currentChatId: string | null;
  isLoading: boolean;
  shouldGenerateResponse: boolean;
  focusInputTrigger: boolean;
}

// Create the initial state
const initialState: chatsState$ = {
  chatsList: [],
  currentChatId: null,
  isLoading: false,
  shouldGenerateResponse: false,
  focusInputTrigger: false,
};

interface FileWithPreview {
  file: File;
  preview: string;
  selected: boolean;
  id: string;
}

// Create the observable state
export const chatsState$ = observable<chatsState$>(initialState);

// Setup persistence
persistObservable(chatsState$, {
  local: {
    name: 'chats-state',
    transform: {
      // Don't persist files across reloads - process before saving to storage
      out: (value: chatsState$) => {
        // Create a copy to avoid modifying the original
        const copy = { ...value };

        // Remove files property from each chat before persisting
        if (copy.chatsList) {
          copy.chatsList = copy.chatsList.map((chat) => {
            // Destructure to separate files from the rest
            const { files, ...rest } = chat;
            return rest;
          });
        }

        return copy;
      },
      // Transform is one-way since we don't need to add anything on load
      in: (value: any) => value,
    },
  },
});

// Computed values for common selections
export const currentChatId = computed(() => {
  return chatsState$.currentChatId.get();
});

export const chatsList = computed(() => chatsState$.chatsList.get());

export const currentChat = computed(() => {
  const id = chatsState$.currentChatId.get();
  if (!id) return null;

  return chatsState$.chatsList.get().find((chat) => chat.id === id) || null;
});

export const currentChatMessages = computed(() => {
  const chat = currentChat.get();
  return chat?.messages || [];
});

// Flag to track if initialization has been completed
let hasInitialized = false;

/**
 * Initialize the chats state
 * This ensures we always have at least one chat available and proper state setup
 */
export const initializeChats = () => {
  console.log('Initializing chats state...');
  const chatsList = chatsState$.chatsList.get();
  const currentChatId = chatsState$.currentChatId.get();

  // Create a default chat if none exist
  if (chatsList.length === 0) {
    console.log('No chats found, creating default chat');
    createChat();
    hasInitialized = true;
    return;
  }

  // Check if we have a valid current chat ID
  if (!currentChatId || !chatsList.find((chat) => chat.id === currentChatId)) {
    console.log('Current chat ID is invalid, setting to first available chat');
    chatsState$.currentChatId.set(chatsList[0].id);
  }

  // Ensure all chats have the required fields (in case of schema changes)
  const updatedChats = chatsList.map((chat) => {
    // Ensure all required properties exist with defaults if missing
    return {
      ...chat,
      smartHubSimilarityThreshold:
        chat.smartHubSimilarityThreshold || DEFAULT_SIMILARITY_THRESHOLD,
      smartHubChunks: chat.smartHubChunks || DEFAULT_CHUNKS_COUNT,
      createdAt: chat.createdAt || Date.now(),
      updatedAt: chat.updatedAt || Date.now(),
    };
  });

  // Only update if there were changes to avoid unnecessary renders
  if (JSON.stringify(chatsList) !== JSON.stringify(updatedChats)) {
    console.log('Updating chats with missing fields');
    chatsState$.chatsList.set(updatedChats);
  }
  hasInitialized = true;
};

/**
 * Check if chats have been properly initialized
 */
export const isChatsInitialized = () => {
  return hasInitialized && chatsState$.chatsList.get().length > 0;
};

// Chat actions
export function createChat(title?: string) {
  const chatId = uuidv4();
  const now = Date.now();

  // Create a default title if none provided
  const chatTitle = title || `New Conversation`;

  // Create the new chat
  const newChat: Chat = {
    id: chatId,
    title: chatTitle,
    messages: [],
    smartHubSimilarityThreshold: DEFAULT_SIMILARITY_THRESHOLD,
    smartHubChunks: DEFAULT_CHUNKS_COUNT,
    createdAt: now,
    updatedAt: now,
  };

  // Add the new chat to the list and set as current
  batch(() => {
    chatsState$.chatsList.push(newChat);
    chatsState$.currentChatId.set(chatId);
  });
  return newChat;
}

export function openChat(chatId: string) {
  chatsState$.currentChatId.set(chatId);
  const result =
    chatsState$.chatsList.get().find((chat) => chat.id === chatId) || null;
  return result;
}

export function addMessage(message: Message) {
  const currentChatId = chatsState$.currentChatId.get();

  // Ensure there IS a current chat selected before adding a message
  if (!currentChatId) {
    return;
  }

  const chatsList = chatsState$.chatsList.get();
  const chatIndex = chatsList.findIndex((chat) => chat.id === currentChatId);

  // Handle case where currentChatId might be invalid (e.g., deleted just before)
  if (chatIndex === -1) {
    return;
  }

  // Create a new updated chatsList
  const updatedChats = [...chatsList];
  updatedChats[chatIndex] = {
    ...updatedChats[chatIndex],
    messages: [...updatedChats[chatIndex].messages, message],
    updatedAt: Date.now(),
  };

  // Move updated chat to the top (optional UX improvement)
  const updatedChat = updatedChats.splice(chatIndex, 1)[0];
  updatedChats.unshift(updatedChat);

  // Update state
  chatsState$.chatsList.set(updatedChats);

  return message;
}

// Cache for message content to prevent duplicate updates
const messageContentCache = new Map<string, string>();

export function updateMessage(params: {
  messageId: string;
  content: string;
  usedSmartHubs: string[];
}) {
  const { messageId, content, usedSmartHubs } = params;

  // Skip update if content hasn't changed
  if (messageContentCache.get(messageId) === content) {
    return;
  }

  const currentChatId = chatsState$.currentChatId.get();

  if (!currentChatId) {
    return;
  }

  const chatsList = chatsState$.chatsList.get();
  const chatIndex = chatsList.findIndex((chat) => chat.id === currentChatId);

  if (chatIndex === -1) {
    return;
  }

  const chat = chatsList[chatIndex];
  const messageIndex = chat.messages.findIndex((msg) => msg.id === messageId);

  if (messageIndex === -1) {
    return;
  }

  // Update the cache with new content
  messageContentCache.set(messageId, content);

  // Use batching to group state updates
  batch(() => {
    // Create a new updated chatsList - this is more efficient than updating nested objects
    const updatedMessages = [...chat.messages];
    updatedMessages[messageIndex] = {
      ...updatedMessages[messageIndex],
      contentParts: [{ type: 'text', text: content }],
      usedSmartHubs,
    };

    const updatedChats = [...chatsList];
    updatedChats[chatIndex] = {
      ...updatedChats[chatIndex],
      messages: updatedMessages,
      updatedAt: Date.now(),
    };

    // Single update to reduce cascading renders
    chatsState$.chatsList.set(updatedChats);
  });
}

export function deleteMessage(messageId: string) {
  const currentChatId = chatsState$.currentChatId.get();

  if (!currentChatId) {
    return;
  }

  const chatsList = chatsState$.chatsList.get();
  const chatIndex = chatsList.findIndex((chat) => chat.id === currentChatId);

  if (chatIndex === -1) {
    return;
  }

  const chat = chatsList[chatIndex];
  const updatedMessages = chat.messages.filter((msg) => msg.id !== messageId);

  // Clean up cache if the message is deleted
  if (messageContentCache.has(messageId)) {
    messageContentCache.delete(messageId);
  }

  const updatedChats = [...chatsList];
  updatedChats[chatIndex] = {
    ...updatedChats[chatIndex],
    messages: updatedMessages,
    updatedAt: Date.now(),
  };

  chatsState$.chatsList.set(updatedChats);
}

export function updateChatTitle(params: { chatId: string; newTitle: string }) {
  const { chatId, newTitle } = params;

  const chatsList = chatsState$.chatsList.get();
  const chatIndex = chatsList.findIndex((chat) => chat.id === chatId);

  if (chatIndex === -1) {
    return;
  }

  const updatedChats = [...chatsList];
  updatedChats[chatIndex] = {
    ...updatedChats[chatIndex],
    title: newTitle,
    updatedAt: Date.now(),
  };

  chatsState$.chatsList.set(updatedChats);
}

export function deleteChat(chatId: string) {
  const state = chatsState$.get();

  // Remove the chat from the list
  const updatedChats = state.chatsList.filter((chat) => chat.id !== chatId);

  // Clean up cache for all messages in the deleted chat
  const chatToDelete = state.chatsList.find((chat) => chat.id === chatId);
  if (chatToDelete) {
    chatToDelete.messages.forEach((msg) => {
      if (messageContentCache.has(msg.id)) {
        messageContentCache.delete(msg.id);
      }
    });
  }

  batch(() => {
    // Update state
    chatsState$.chatsList.set(updatedChats);

    // If we deleted the current chat, switch to the first available chat
    if (state.currentChatId === chatId) {
      chatsState$.currentChatId.set(updatedChats[0]?.id || null);
    }
  });
}

export function clearChat(chatId: string) {
  const chatsList = chatsState$.chatsList.get();
  const chatIndex = chatsList.findIndex((chat) => chat.id === chatId);

  if (chatIndex === -1) {
    return;
  }

  // Clean up cache for all messages in the chat
  const chatToClear = chatsList[chatIndex];
  chatToClear.messages.forEach((msg) => {
    if (messageContentCache.has(msg.id)) {
      messageContentCache.delete(msg.id);
    }
  });

  const updatedChats = [...chatsList];
  updatedChats[chatIndex] = {
    ...updatedChats[chatIndex],
    messages: [],
    updatedAt: Date.now(),
  };

  chatsState$.chatsList.set(updatedChats);
}

export function sendNoteToChat(params: { chatId: string; content: string }) {
  const { chatId, content } = params;
  const chatsList = chatsState$.chatsList.get();

  const chatIndex = chatsList.findIndex((chat) => chat.id === chatId);

  if (chatIndex !== -1) {
    // Create a new message with the note content
    const message: Message = {
      id: uuidv4(),
      role: 'user',
      contentParts: [{ type: 'text', text: content }],
      timestamp: Date.now(),
    };

    // Create a new updated chatsList
    const updatedChats = [...chatsList];
    const chat = { ...updatedChats[chatIndex] };

    updatedChats[chatIndex] = {
      ...chat,
      messages: [...chat.messages, message],
      updatedAt: Date.now(),
    };

    // Bring the chat to the top if it's not already there
    if (chatIndex !== 0) {
      const updatedChat = updatedChats.splice(chatIndex, 1)[0];
      updatedChats.unshift(updatedChat);
    }

    // Use batching to avoid cascading updates
    batch(() => {
      // Update state
      chatsState$.chatsList.set(updatedChats);
      chatsState$.currentChatId.set(chatId);
      chatsState$.shouldGenerateResponse.set(true);
    });

    return message;
  }

  return null;
}

export function addFilesToChat(params: {
  chatId: string;
  files: FileWithPreview[];
}) {
  const { chatId, files } = params;
  const chatsList = chatsState$.chatsList.get();

  const chatIndex = chatsList.findIndex((chat) => chat.id === chatId);

  if (chatIndex !== -1) {
    const updatedChats = [...chatsList];
    updatedChats[chatIndex] = {
      ...updatedChats[chatIndex],
      files: files,
    };

    chatsState$.chatsList.set(updatedChats);
  }

  return null;
}

export function updateFilesInChat(params: {
  chatId: string;
  files: FileWithPreview[];
}) {
  const { chatId, files } = params;
  const chatsList = chatsState$.chatsList.get();
  const chatIndex = chatsList.findIndex((chat) => chat.id === chatId);

  if (chatIndex !== -1) {
    const updatedChats = [...chatsList];
    updatedChats[chatIndex] = {
      ...updatedChats[chatIndex],
      files: files,
    };

    chatsState$.chatsList.set(updatedChats);
  }

  return null;
}

export function getFilesFromChat(chatId: string) {
  const chatsList = chatsState$.chatsList.get();
  const chatIndex = chatsList.findIndex((chat) => chat.id === chatId);

  const result = chatsList[chatIndex]?.files || [];
  return result;
}

export function getSmartHubSearchParams(chatId: string) {
  const chat = chatsState$.chatsList.get().find((chat) => chat.id === chatId);
  return {
    similarityThreshold:
      chat?.smartHubSimilarityThreshold || DEFAULT_SIMILARITY_THRESHOLD,
    chunks: chat?.smartHubChunks || DEFAULT_CHUNKS_COUNT,
  };
}

// Helper to set shouldGenerateResponse flag
export function setShouldGenerateResponse(value: boolean) {
  chatsState$.shouldGenerateResponse.set(value);
}

export function updateSmartHubSearchParams(params: {
  chatId: string;
  searchParams: {
    similarityThreshold: SimilarityThresholdLevel;
    chunks: number;
  };
}) {
  const { chatId, searchParams } = params;
  const chatsList = chatsState$.chatsList.get();
  const chatIndex = chatsList.findIndex((chat) => chat.id === chatId);

  if (chatIndex !== -1) {
    const updatedChats = [...chatsList];
    updatedChats[chatIndex] = {
      ...updatedChats[chatIndex],
      smartHubSimilarityThreshold: searchParams.similarityThreshold,
      smartHubChunks: searchParams.chunks,
    };

    chatsState$.chatsList.set(updatedChats);
  }
}
