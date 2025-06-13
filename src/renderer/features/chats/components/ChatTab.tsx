import React, { useCallback, useRef, useState } from 'react';
import { observer } from '@legendapp/state/react';
import { toast } from 'sonner';
import { FiPlus } from 'react-icons/fi';

// UI Components
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Button } from '@/components/ui/button';

// Components
import { ChatItem } from '@/features/chats/components/ChatItem';
import { DeleteChatDialog } from '@/features/chats/components/dialogs/DeleteChatDialog';
import { ClearChatDialog } from '@/features/chats/components/dialogs/ClearChatDialog';

// Hooks
import { useChatsList } from '@/features/chats/hooks/useChatsList';
import { useChatEditing } from '@/features/chats/hooks/useChatEditing';
import { useChatActions } from '@/features/chats/hooks/useChatActions';

// State
import { chatsState$, createChat } from '@/features/chats/state/chatsState';

/**
 * Header component for the chats tab
 * Provides actions like creating a new chat
 */
const ChatTabHeaderComponent: React.FC = () => {
  const handleCreateChat = useCallback(() => {
    try {
      // Use the returned value directly instead of relying on state update
      createChat();
      setTimeout(() => {
        chatsState$.focusInputTrigger.set(true);
      }, 100);
    } catch (error) {
      console.error('Error creating chat:', error);
      toast.error('Failed to create new chat');
    }
  }, []);

  // Handle creating a new chat
  return (
    <div className="flex gap-1">
      <Button
        variant="ghost"
        size="sm"
        className="text-xs"
        onClick={handleCreateChat}
      >
        <FiPlus size={14} />
      </Button>
    </div>
  );
};

export const ChatTabHeader = React.memo(ChatTabHeaderComponent);

/**
 * Main content component for the chats tab
 * Renders the list of chats with editing, deletion, and clearing capabilities
 */
const ChatTabContentComponent: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const chatsAreaRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Use custom hooks
  const { chatsList, currentChatId, handleOpenChat, hasChats } = useChatsList();

  const {
    editingChatId,
    editingChatTitle,
    handleStartEditing,
    handleSaveTitle,
    handleTitleChange,
    handleKeyPress,
  } = useChatEditing();

  const {
    // Delete related
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    handleDeleteChat,
    confirmDeleteChat,
    cancelDeleteChat,

    // Clear related
    isClearDialogOpen,
    setIsClearDialogOpen,
    handleClearChat,
    confirmClearChat,
    cancelClearChat,
  } = useChatActions();

  const handleCreateChat = useCallback(() => {
    try {
      // Use the returned value directly instead of relying on state update
      createChat();
      setTimeout(() => {
        chatsState$.focusInputTrigger.set(true);
      }, 100);
    } catch (error) {
      console.error('Error creating chat:', error);
      toast.error('Failed to create new chat');
    }
  }, []);

  // Handle renaming a chat (adapter between useChatEditing and ChatItem)
  const handleRenameChat = (chatId: string) => {
    const chat = chatsList.find((c) => c?.id === chatId);
    if (chat) {
      handleStartEditing(chat);
      setTimeout(() => {
        if (renameInputRef.current) {
          renameInputRef.current.focus();
          renameInputRef.current.select();
        }
      }, 100);
    }
  };

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className="p-2 h-full min-h-full flex-grow overflow-auto"
            ref={chatsAreaRef}
            style={{ minHeight: '100%' }}
          >
            {isLoading ? (
              <div className="flex justify-center items-center h-20">
                <span className="animate-spin h-5 w-5 border-2 border-gray-500 rounded-full border-t-transparent"></span>
              </div>
            ) : hasChats ? (
              <div className="flex flex-col gap-1">
                {[...chatsList]
                  .filter((chat) => chat !== undefined)
                  .sort((a, b) => {
                    if (!a || !b) return 0;
                    return (b.updatedAt || 0) - (a.updatedAt || 0);
                  })
                  .map((chat) => (
                    <ChatItem
                      key={chat.id}
                      chat={chat}
                      isActive={currentChatId === chat.id}
                      isEditing={editingChatId === chat.id}
                      editTitle={editingChatTitle}
                      renameInputRef={renameInputRef}
                      onOpenChat={handleOpenChat}
                      onRenameChat={handleRenameChat}
                      onClearChat={handleClearChat}
                      onDeleteChat={handleDeleteChat}
                      onSaveTitle={handleSaveTitle}
                      onEditTitleChange={handleTitleChange}
                      onKeyPress={handleKeyPress}
                    />
                  ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground p-4">
                No chats yet
              </div>
            )}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={handleCreateChat}>
            Create new chat
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {/* Delete chat confirmation dialog */}
      <DeleteChatDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={() => confirmDeleteChat(chatsList.length)}
        onCancel={cancelDeleteChat}
      />

      {/* Clear chat confirmation dialog */}
      <ClearChatDialog
        isOpen={isClearDialogOpen}
        onOpenChange={setIsClearDialogOpen}
        onConfirm={confirmClearChat}
        onCancel={cancelClearChat}
      />
    </>
  );
};

// Export the main content component
export const ChatTab = observer(ChatTabContentComponent);
