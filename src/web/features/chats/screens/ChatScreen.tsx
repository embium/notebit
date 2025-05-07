/**
 * ChatScreen component
 * Main screen for the chat feature, implements the chat interface
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { observer } from '@legendapp/state/react';
import { toast } from 'sonner';

// Components
import { LoadingState } from '@/features/chats/components/LoadingState';
import { ChatHeader } from '@/features/chats/components/ChatHeader';
import { ChatMessageList } from '@/features/chats/components/ChatMessageList';
import { ChatInput } from '@/features/chats/components/ChatInput';

// Hooks
import { useActiveChatSwitching } from '@/features/chats/hooks/useActiveChatSwitching';
import { useAIResponseGeneration } from '@/features/chats/hooks/useAIResponseGeneration';
import { useMessageHandling } from '@/features/chats/hooks/useMessageHandling';
import { useFileAttachment } from '@/features/chats//hooks/useFileAttachment';
import { useSmartHubIntegration } from '@/features/chats/hooks/useSmartHubIntegration';

// State
import {
  chatsState$,
  initializeChats,
  isChatsInitialized,
} from '@/features/chats/state/chatsState';
import {
  enabledModels,
  setSelectedModel,
  selectedModel,
} from '@/features/settings/state/aiSettings/aiSettingsState';
import { aiSettingsState$ } from '@/features/settings/state/aiSettings/aiProviders/providerConfigs';
import { NoticeState } from '../components/NoticeState';

/**
 * Props for the ChatScreen component
 */
interface ChatsScreenProps {
  isMiddlebarCollapsed?: boolean;
  onToggleMiddleSidebar?: () => void;
}

/**
 * ChatsScreen component
 * Main chat interface with messages list and input
 */
const ChatScreenComponent: React.FC<ChatsScreenProps> = ({
  isMiddlebarCollapsed = false,
  onToggleMiddleSidebar = () => {},
}) => {
  // State to track component initialization
  const [isInitialized, setIsInitialized] = React.useState(false);

  // Get values from state
  const selectedModelValue = selectedModel.get();
  const enabledModelsValue = enabledModels.get();
  const shouldGenerateResponse = chatsState$.shouldGenerateResponse.get();

  // Use custom hooks for chat switching
  const { activeChat, isSwitchingChat } = useActiveChatSwitching();

  // State for input text and error
  const [inputText, setInputText] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  // Reference to the message list component for scrolling
  const messageListRef = useRef<HTMLDivElement>(null);

  // Ref to track if we're already processing a response generation
  const isProcessingResponseRef = useRef<boolean>(false);

  // Function to scroll to bottom of the message list
  const scrollToBottom = useCallback(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, []);

  // Check initialization on component mount
  useEffect(() => {
    // Make sure chats are initialized
    if (!isChatsInitialized()) {
      console.log('Re-initializing chats');
      initializeChats();
    }

    // Ensure we have a selected model and log detailed information
    if (!selectedModelValue) {
      console.warn('No model selected, cannot generate responses', {
        availableModels: enabledModelsValue.length,
        selectedModelId: aiSettingsState$.selectedModelId?.get(),
      });
      return;
    } else {
      console.log('Using model:', {
        name: selectedModelValue.name,
        id: selectedModelValue.id,
        provider: selectedModelValue.provider,
      });
      // If we had an error about model selection but now have a valid model, clear it
      if (error?.includes('select an AI model')) {
        setError(null);
      }
    }

    setIsInitialized(true);
  }, [selectedModelValue, enabledModelsValue.length, error]);

  // Use message handling hooks to get callback functions
  const { addAssistantMessage } = useMessageHandling(
    activeChat,
    scrollToBottom,
    setInputText,
    setError,
    () => {} // placeholder, will be replaced with real function
  );

  const { selectedFiles, documentsAvailable } = useFileAttachment({});

  // Get smart hub integration data
  const { usedSmartHubs, getSmartHubsContext, hasSelectedSmartHubs } =
    useSmartHubIntegration();

  // Use AI response generation hook
  const { isLoading, generateAIResponse, handleCancelGeneration } =
    useAIResponseGeneration(
      addAssistantMessage,
      scrollToBottom,
      shouldGenerateResponse,
      documentsAvailable,
      getSmartHubsContext,
      usedSmartHubs
    );

  // Now get the complete message handling with the AI response function
  const {
    addUserMessage,
    handleEditMessage,
    handleDeleteMessage,
    handleSend: originalHandleSend,
    handleResendMessage,
  } = useMessageHandling(
    activeChat,
    scrollToBottom,
    setInputText,
    setError,
    generateAIResponse
  );

  // Wrap the send handler with initialization checks
  const handleSend = useCallback(
    async (message: string) => {
      // Don't process empty messages
      if (!message.trim()) return;

      // Check if everything is ready
      if (!isInitialized) {
        console.log('Component not fully initialized, aborting send');
        toast.error('Application still initializing. Please try again.');
        return;
      }

      // Get the latest model state
      const currentModel = selectedModel.get();

      // Check if a model is selected
      if (!currentModel) {
        console.log('No model selected, aborting send');
        setError('Please select an AI model in settings to generate responses');
        return;
      }

      // Log model information to help with debugging
      console.log('Sending message with model:', {
        name: currentModel.name,
        id: currentModel.id,
        provider: currentModel.provider,
      });

      // Check if we have an active chat
      if (!activeChat.get()) {
        console.log('No active chat, initializing');
        initializeChats();

        // If initialization doesn't create a chat, we can't proceed
        if (!activeChat.get()) {
          console.error('Failed to initialize chat');
          toast.error(
            'Failed to initialize chat. Please refresh the application.'
          );
          return;
        }
      }

      console.log('Validation passed, sending message:', message);
      await originalHandleSend(message);
    },
    [originalHandleSend, isInitialized, activeChat]
  );

  // Handle selecting a model
  const handleSelectModel = useCallback((modelId: string) => {
    setSelectedModel(modelId);
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Use the extracted ChatHeader component */}
      <ChatHeader
        isMiddlebarCollapsed={isMiddlebarCollapsed}
        onToggleMiddleSidebar={onToggleMiddleSidebar}
        activeChat={activeChat.get()}
      />

      {/* Chat Messages in the middle - will scroll internally */}
      <div className="flex-1 min-h-0 w-full relative">
        {!selectedModelValue ? (
          <NoticeState />
        ) : isSwitchingChat || !isInitialized ? (
          <LoadingState />
        ) : (
          <ChatMessageList
            ref={messageListRef}
            messages={activeChat.get()?.messages || []}
            onEditMessage={handleEditMessage}
            onDeleteMessage={handleDeleteMessage}
            onResendMessage={handleResendMessage}
          />
        )}
      </div>
      <ChatInput
        value={inputText}
        onChange={setInputText}
        onSend={handleSend}
        isLoading={isLoading}
        onCancel={handleCancelGeneration}
        error={error}
        enabledModels={enabledModelsValue}
        selectedModel={selectedModelValue}
        onSelectModel={handleSelectModel}
        notesList={[]} // We'll need to pass notes if needed
        getContent={async () => ''} // Placeholder - replace with actual implementation
      />
    </div>
  );
};

export const ChatScreen = observer(ChatScreenComponent);
