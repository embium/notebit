import { useCallback } from 'react';

// Utils
import {
  MessageRole,
  createSimpleMessage,
} from '@/features/chats/utils/messageUtils';

// API
import { generateText } from '@/features/chats/api/generate-text';

// Types
import { MessageTextPart, Message } from '@src/types/chats';

// State
import { defaultPromptsState$ } from '@/features/settings/state/defaultPromptsState';
import { generalSettingsState$ } from '@/features/settings/state/generalSettingsState';
import {
  addMessage,
  deleteMessage,
  currentChat,
  createChat,
  updateChatTitle,
} from '@/features/chats/state/chatsState';
import {
  selectedModel,
  createModelInstance,
} from '@/features/settings/state/aiSettings/aiSettingsState';

interface UseMessageHandlingResult {
  addUserMessage: (content: string) => Message;
  addAssistantMessage: (content: string) => Message;
  handleEditMessage: (messageId: string) => void;
  handleDeleteMessage: (messageId: string) => void;
  handleSend: (message: string) => Promise<void>;
  handleResendMessage: (messageId: string) => void;
  generateChatTitle: (message: string) => Promise<void>;
}

export function useMessageHandling(
  activeChat: any,
  scrollToBottom: () => void,
  setInputText: (text: string) => void,
  setError: (error: string | null) => void,
  generateAIResponse: (message: Message) => void
): UseMessageHandlingResult {
  // Get current values
  const currentChatValue = currentChat.get();
  const selectedModelValue = selectedModel.get();
  const generateTitlePrompt = defaultPromptsState$.title.get();
  const shouldGenerateChatTitle =
    generalSettingsState$.shouldGenerateChatTitles.get();

  // Generate a title for the chat - defined first to avoid reference before declaration
  const generateChatTitle = useCallback(
    async (message: string) => {
      if (!selectedModelValue || !shouldGenerateChatTitle) return;

      const modelInstance = createModelInstance(selectedModelValue);
      const prompt = `${generateTitlePrompt} \n\nThe first message in the chat is: \n\n ${message}`;

      const constructedMessage = createSimpleMessage(
        MessageRole.User,
        prompt,
        selectedModelValue?.name
      );

      const reasoningRegex = /<think>([\s\S]*?)(?:<\/think>|$)/g;

      const title = await generateText(modelInstance, {
        messages: [constructedMessage],
      });
      if (title) {
        updateChatTitle({
          chatId: activeChat.get()?.id!,
          newTitle: title.replace(reasoningRegex, ''),
        });
      }
    },
    [selectedModelValue, activeChat]
  );

  // Function to add a user message
  const addUserMessage = useCallback(
    (content: string) => {
      // Ensure we have an active chat
      let chatToUse = activeChat.get();

      // If no active chat, create one and use it
      if (!chatToUse) {
        chatToUse = createChat();
        activeChat.set(chatToUse);
      }

      const messagesLength = activeChat.get()?.messages.length;
      if (messagesLength === 0) {
        // Generate title for new chats
        generateChatTitle(content);
      }

      // Create the user message
      const newMessage = createSimpleMessage(
        MessageRole.User,
        content,
        selectedModelValue?.name
      );

      // Add to persistent state
      addMessage(newMessage);

      // Scroll to bottom when adding a message
      setTimeout(scrollToBottom, 10);

      return newMessage;
    },
    [selectedModelValue, activeChat, scrollToBottom, generateChatTitle]
  );

  // Function to add an assistant message
  const addAssistantMessage = useCallback(
    (content: string) => {
      // Create the message
      const newMessage = createSimpleMessage(
        MessageRole.Assistant,
        content,
        selectedModelValue?.name
      );

      // Add to persistent state
      addMessage(newMessage);

      // Scroll to bottom
      setTimeout(scrollToBottom, 10);

      return newMessage;
    },
    [selectedModelValue, scrollToBottom]
  );

  // Handle editing a message
  const handleEditMessage = useCallback(
    (messageId: string) => {
      // Find the message to edit
      if (!currentChatValue) return;
      const messageToEdit = currentChatValue.messages.find(
        (msg: Message) => msg.id === messageId
      );
      if (!messageToEdit) return;

      // Extract the text content
      const textContent = messageToEdit.contentParts
        .filter((part: any) => part.type === 'text')
        .map((part: any) => part.text)
        .join('');

      // Set the input text to the message content
      setInputText(textContent);

      // Clear out all messages after the message to resend
      const messagesAfterEdit = currentChatValue.messages.slice(
        currentChatValue.messages.indexOf(messageToEdit)
      );
      messagesAfterEdit.forEach((msg: Message) => {
        deleteMessage(msg.id);
      });

      // Focus the input
      setTimeout(() => {
        const inputElement = document.querySelector(
          'textarea'
        ) as HTMLTextAreaElement;
        if (inputElement) {
          inputElement.focus();
        }
      }, 100);
    },
    [currentChatValue, setInputText]
  );

  // Handle deleting a message
  const handleDeleteMessage = useCallback((messageId: string) => {
    // Remove the message from chat state
    deleteMessage(messageId);
  }, []);

  // Handle sending a message
  const handleSend = useCallback(
    async (message: string) => {
      if (!message) return;

      // Reset states
      setInputText('');
      setError(null);

      try {
        // Add user message and keep reference
        const userMessage = addUserMessage(message);

        // Directly trigger AI response generation for this message
        // For normal chat messages, we don't use shouldGenerateResponse flag
        // which is reserved for note-to-chat functionality
        console.log(
          'Directly generating AI response for message:',
          userMessage.id
        );
        generateAIResponse(userMessage);
      } catch (error) {
        console.error('Error in message flow:', error);
        setError('Failed to process message. Please try again.');
      }
    },
    [addUserMessage, generateAIResponse, setInputText, setError]
  );

  // Handle resending a message
  const handleResendMessage = useCallback(
    (messageId: string) => {
      // Find the message to resend
      if (!currentChatValue) return;
      const messageToResend = currentChatValue.messages.find(
        (msg: Message) => msg.id === messageId
      );
      if (!messageToResend) return;

      // Clear out all messages after the message to resend
      const messagesAfterResend = currentChatValue.messages.slice(
        currentChatValue.messages.indexOf(messageToResend) + 1
      );
      messagesAfterResend.forEach((msg: Message) => {
        deleteMessage(msg.id);
      });

      // Directly call response generation
      generateAIResponse(messageToResend);
    },
    [currentChatValue, generateAIResponse]
  );

  return {
    addUserMessage,
    addAssistantMessage,
    handleEditMessage,
    handleDeleteMessage,
    handleSend,
    handleResendMessage,
    generateChatTitle,
  };
}
