import { useCallback, useEffect, useRef, useState } from 'react';
import { useObserve } from '@legendapp/state/react';
import { throttle } from 'lodash';
import { toast } from 'sonner';

// API
import { streamText } from '@/features/chats/api/stream-text';

// Utils
import {
  createSimpleMessage,
  MessageRole,
  MessageRoleType,
} from '@/features/chats/utils/messageUtils';

// State
import { defaultPromptsState$ } from '@/features/settings/state/defaultPromptsState';
import {
  createModelInstance,
  selectedModel,
} from '@/features/settings/state/aiSettings/aiSettingsState';
import {
  updateMessage,
  currentChatMessages,
  setShouldGenerateResponse,
  chatsState$,
} from '@/features/chats/state/chatsState';

// Types
import { FileWithPreview } from '@shared/types/common';
import { Message, MessageTextPart } from '@shared/types/chats';
import { onResultChangeWithCancel, ResultChange } from '@/shared/ai/core/base';

// Hooks
import { useFileContent } from './useFileContent';

interface UseAIResponseGenerationResult {
  isLoading: boolean;
  error: string | null;
  generateAIResponse: (userMessage: Message) => void;
  handleCancelGeneration: () => void;
}

export function useAIResponseGeneration(
  addAssistantMessage: (content: string) => Message,
  scrollToBottom: () => void,
  shouldGenerateResponse: boolean,
  documentsAvailable: FileWithPreview[],
  getSmartHubsContext: (messageContent: string) => Promise<string>,
  usedSmartHubs: string[]
): UseAIResponseGenerationResult {
  // State for loading
  const [isLoading, setIsLoading] = useState(false);
  // State for error
  const [error, setError] = useState<string | null>(null);
  // Ref for the streaming message ID
  const streamingMessageIdRef = useRef<string | null>(null);
  // Ref for the abort controller
  const abortControllerRef = useRef<AbortController | null>(null);
  // Ref to track if we're already processing a response generation
  const isProcessingResponseRef = useRef<boolean>(false);
  // Ref for message content to prevent state updates racing with each other
  const messageContentRef = useRef<string>('');
  // Ref to store the current used smart hubs
  const currentUsedSmartHubsRef = useRef<string[]>([]);
  // File content loading hook
  const { getFileContents } = useFileContent();

  const systemPrompt = defaultPromptsState$.system.get();

  // Get state values - use ref to avoid dependency issues
  const selectedModelRef = useRef(selectedModel.get());
  const currentChatMessagesRef = useRef(currentChatMessages.get());

  const currentChatsList = chatsState$.chatsList.get();
  const currentChatId = chatsState$.currentChatId.get();

  // Update refs when values change, but don't cause re-renders
  useEffect(() => {
    selectedModelRef.current = selectedModel.get();
    currentChatMessagesRef.current = currentChatMessages.get();
  }, []);

  // Fix: Add a proper effect to update selectedModelRef whenever selectedModel changes
  // This is critical for detecting model changes after initialization
  useEffect(() => {
    const updateSelectedModel = () => {
      const currentModel = selectedModel.get();
      console.log('Selected model updated:', currentModel?.name || 'None');
      selectedModelRef.current = currentModel;
    };

    // Set initial value
    updateSelectedModel();

    // Subscribe to changes
    const unsubscribe = selectedModel.onChange(updateSelectedModel);

    // Cleanup subscription on component unmount
    return () => {
      unsubscribe();
    };
  }, []);

  // Create a separate effect to track usedSmartHubs changes
  useEffect(() => {
    // Only update if the content has actually changed
    const currentHubs = currentUsedSmartHubsRef.current;

    // Skip update if arrays are identical
    if (
      currentHubs.length === usedSmartHubs.length &&
      currentHubs.every((hub, i) => hub === usedSmartHubs[i])
    ) {
      return;
    }

    // Update the ref when usedSmartHubs changes
    console.log('Setting current used smart hubs to:', usedSmartHubs);
    currentUsedSmartHubsRef.current = [...usedSmartHubs];
  }, [usedSmartHubs]);

  // Create throttled update function with useRef to avoid re-creation on render
  const throttledModifyMessageRef = useRef<onResultChangeWithCancel | null>(
    null
  );

  // Function to update a message by ID - keep this stable
  const updateMessageContent = useCallback(
    (id: string, content: string, usedSmartHubs: string[]) => {
      // Only update if content has changed to prevent unnecessary renders
      if (messageContentRef.current !== content) {
        messageContentRef.current = content;
        // Log for debugging
        console.log('Updating message with smart hubs:', usedSmartHubs);
        // Update in chat state
        updateMessage({
          messageId: id,
          content,
          usedSmartHubs: currentUsedSmartHubsRef.current,
        });
      }
    },
    []
  );

  // Generate AI response
  const generateAIResponse = useCallback(
    async (userMessage: Message) => {
      console.log('generateAIResponse called with message:', userMessage.id);

      // Don't proceed if already loading
      if (isLoading) {
        console.log('Skipping AI response generation - already loading');
        return;
      }

      // Set loading state
      setIsLoading(true);
      setError(null);

      try {
        // Create an AbortController
        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        // Create and add assistant message placeholder
        const assistantMessage = addAssistantMessage('');
        console.log(
          'Created assistant message placeholder:',
          assistantMessage.id
        );

        streamingMessageIdRef.current = assistantMessage.id;

        // Reset message content ref for the new message
        messageContentRef.current = '';

        const selectedModelValue = selectedModelRef.current;

        // Critical validation: Make sure we have a valid model
        if (!selectedModelValue) {
          const errorMsg =
            'No AI model selected. Please select a model in settings.';
          console.error(errorMsg);
          setError(errorMsg);

          // Update the placeholder message to indicate error
          updateMessageContent(
            assistantMessage.id,
            '⚠️ Error: No AI model selected. Please select a model in settings.',
            []
          );

          setIsLoading(false);
          return;
        }

        // Attempt to create the model instance
        let modelInstance;
        try {
          modelInstance = createModelInstance(selectedModelValue);
          if (!modelInstance)
            throw new Error('Failed to create model instance');
        } catch (modelError) {
          console.error('Failed to initialize AI model:', modelError);
          updateMessageContent(
            assistantMessage.id,
            `⚠️ Error: Could not initialize AI model (${selectedModelValue.name}). Please check your model settings.`,
            []
          );
          setIsLoading(false);
          return;
        }

        const contextMessageLimit = selectedModelValue.contextMessageLimit || 1;

        const currentChatMessagesValue = currentChatMessagesRef.current;
        const prevMessages = currentChatMessagesValue.slice(
          Math.max(1, currentChatMessagesValue.length - contextMessageLimit)
        );

        if (
          prevMessages.length > 0 &&
          prevMessages[0].role === MessageRole.Assistant
        ) {
          prevMessages.shift();
        }

        // Process file attachments if any - only use selected documents
        let fileAttachmentContent = '';
        const selectedFiles = documentsAvailable.filter(
          (file) => file.selected === true
        );

        let userMessageContent =
          userMessage.contentParts[0].type === 'text'
            ? userMessage.contentParts[0].text
            : '';

        // Get smart hubs context but DON'T add it to userMessageContent
        // It will be added to the system message instead
        const smartHubsContext = await getSmartHubsContext(userMessageContent);

        // Important: Capture the current state of usedSmartHubs right after context generation
        // This ensures we have the right smart hubs for this specific message
        console.log('After context generation, smart hubs are:', usedSmartHubs);
        currentUsedSmartHubsRef.current = [...usedSmartHubs];
        console.log('Stored in ref:', currentUsedSmartHubsRef.current);

        // Log how many documents were selected vs. total
        console.log(
          `Selected ${selectedFiles.length} documents out of ${documentsAvailable.length} available documents`
        );

        if (selectedFiles.length > 0) {
          try {
            // Log the selected files for debugging
            console.log('Processing selected files:', selectedFiles.length);

            // Get selected files content
            const fileContents = await getFileContents(selectedFiles);
            console.log('File contents loaded:', fileContents.length);

            if (fileContents.length > 0) {
              // Create a separator for file contents
              fileAttachmentContent = '\n\n--- ATTACHED FILES ---\n\n';

              // Prepare files content to be appended to the message
              fileAttachmentContent += fileContents
                .map((file) => {
                  // Find the original file object
                  const fileObj = selectedFiles.find(
                    (f) => f.id === file.id
                  )?.file;
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
                  } else if (
                    fileName.endsWith('.doc') ||
                    fileName.endsWith('.docx')
                  ) {
                    return `[Word Document: ${fileName}${fileSize}]\n${file.content}`;
                  } else {
                    return `[File: ${fileName}${fileSize} (${fileType})]\n${file.content}`;
                  }
                })
                .join('\n\n');

              fileAttachmentContent += '\n\n--- END OF ATTACHED FILES ---';
              console.log('File attachment content prepared');
            }
          } catch (error) {
            console.error('Error processing file attachments:', error);
            // Add error information to the message
            fileAttachmentContent = '\n\n[Error processing file attachments]';
          }
        }

        // Create a modified system prompt that includes the smart hubs context if available

        if (smartHubsContext) {
          userMessageContent += `\n\n${smartHubsContext}`;
        }

        if (fileAttachmentContent) {
          userMessageContent += `\n\n${fileAttachmentContent}`;
        }

        // Create a cloned enhanced message instead of modifying the original
        const enhancedUserMessage = {
          ...userMessage,
          contentParts: [
            {
              ...userMessage.contentParts[0],
              text: userMessageContent,
            },
            ...userMessage.contentParts.slice(1),
          ],
        };

        console.log('Enhanced user message:', enhancedUserMessage);

        // Create history messages for the AI
        const historyMessages = [
          // System message with enhanced prompt including smart hub context
          {
            id: 'system-message',
            role: MessageRole.System,
            contentParts: [
              {
                type: 'text',
                text: systemPrompt,
              },
            ],
            timestamp: Date.now(),
            model: selectedModelValue?.name,
          } as Message,
          ...prevMessages,
          enhancedUserMessage,
        ];

        console.log('History messages:', historyMessages.length);

        const startTime = Date.now();
        let firstTokenLatency: number | undefined = undefined;

        // Create the throttled function if it doesn't exist
        if (!throttledModifyMessageRef.current) {
          throttledModifyMessageRef.current =
            throttle<onResultChangeWithCancel>(
              (updated: ResultChange & { cancel?: () => void }) => {
                if (!streamingMessageIdRef.current) return;

                let text = updated.contentParts
                  ?.map((part: { type: string }) => {
                    if (part.type === 'text') {
                      return (part as MessageTextPart).text;
                    }
                    return '';
                  })
                  .join('');

                if (
                  !firstTokenLatency &&
                  ((text && text.length > 0) || updated.reasoningContent)
                ) {
                  firstTokenLatency = Date.now() - startTime;
                  console.log(
                    'First token received after:',
                    firstTokenLatency,
                    'ms'
                  );
                }

                // Only update if content changed and message ID is valid
                if (text && streamingMessageIdRef.current) {
                  updateMessageContent(
                    streamingMessageIdRef.current,
                    text || '',
                    currentUsedSmartHubsRef.current
                  );
                }
              },
              100
            );
        }

        console.log(
          'Starting stream text with model:',
          selectedModelValue.name
        );
        streamText(modelInstance, {
          messages: historyMessages,
          onResultChangeWithCancel:
            throttledModifyMessageRef.current as onResultChangeWithCancel,
        })
          .catch((error) => {
            console.error('Error during stream text:', error);
            if (streamingMessageIdRef.current) {
              updateMessageContent(
                streamingMessageIdRef.current,
                `⚠️ ${error}`,
                currentUsedSmartHubsRef.current
              );
            }
            toast.error('Error generating a response');
          })
          .finally(() => {
            console.log(
              'Stream text completed for message:',
              assistantMessage.id
            );
            setIsLoading(false);
            abortControllerRef.current = null;
          });

        // Ensure scroll to bottom
        setTimeout(scrollToBottom, 100);
      } catch (error) {
        console.error('Error preparing message with attachments:', error);
        toast.error('Error preparing message with attachments');
        setIsLoading(false);
      }
    },
    [
      addAssistantMessage,
      updateMessageContent,
      scrollToBottom,
      isLoading,
      getFileContents,
      documentsAvailable,
      getSmartHubsContext,
      systemPrompt,
    ]
  );

  useObserve([shouldGenerateResponse], async () => {
    if (shouldGenerateResponse) {
      setShouldGenerateResponse(false);
      console.log(currentChatsList, currentChatId);
      const currentChat = currentChatsList.find(
        (chat) => chat.id === currentChatId
      );
      const chatMessages = currentChat?.messages;
      const lastMessage = chatMessages?.[chatMessages.length - 1];
      if (lastMessage?.contentParts[0].type === 'text') {
        const userMessage = createSimpleMessage(
          lastMessage.role as MessageRoleType,
          lastMessage.contentParts[0].text
        );
        await generateAIResponse(userMessage);
      }
    }
  });

  // Handle canceling message generation
  const handleCancelGeneration = useCallback(() => {
    console.log('[ChatsScreen] Cancelling generation');

    // Abort any ongoing requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Reset the loading state
    setIsLoading(false);

    // Reset processing flag
    isProcessingResponseRef.current = false;

    // Reset streaming message reference
    streamingMessageIdRef.current = null;

    // Reset any error
    setError(null);
  }, []);

  return {
    isLoading,
    error,
    generateAIResponse,
    handleCancelGeneration,
  };
}
