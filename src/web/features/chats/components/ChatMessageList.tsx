/**
 * ChatMessageList component
 * Renders a list of chat messages with optimized performance using virtualization
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Message } from '@shared/types/chats';
import { Virtuoso } from 'react-virtuoso';

// Styles
import '@/features/chats/styles/ChatMessageList.css';

// Components
import MessageItem from '@/features/chats/components/MessageItem';
import { MessageContextMenu } from '@/features/chats/components/MessageContextMenu';
import { EmptyState } from '@/features/chats/components/EmptyState';

// Hooks
import { useMessageListScroll } from '@/features/chats/hooks/useMessageListScroll';
import { useNoteOperations } from '@/features/chats/hooks/useNoteOperations';
import { observer } from '@legendapp/state/react';

interface ChatsMessageListProps {
  messages: Message[];
  onEditMessage?: (messageId: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onResendMessage?: (messageId: string) => void;
}

/**
 * ChatMessageList component
 * Optimized rendering of chat messages for web/Electron using virtualization
 */
const ChatMessageListComponent = React.forwardRef<
  HTMLDivElement,
  ChatsMessageListProps
>(({ messages, onEditMessage, onDeleteMessage, onResendMessage }, ref) => {
  // Use custom hooks for scroll behavior and note operations
  const { containerRef, shouldAutoScroll } = useMessageListScroll(messages);
  const { notes, handleSaveAsNote, handleAppendToNote } = useNoteOperations();
  const [selectedText, setSelectedText] = useState<string>('');

  const onSelectedText = useCallback((text: string) => {
    setSelectedText(text);
  }, []);

  // Expose the container ref to the parent component
  React.useImperativeHandle(
    ref,
    () => containerRef.current as HTMLDivElement,
    []
  );

  // Memoize the rendering of each message item
  const renderMessage = useCallback(
    (index: number) => {
      const message = messages[index];
      return (
        <MessageContextMenu
          key={message.id}
          isUser={message.role === 'user'}
          message={message}
          notes={notes}
          selectedText={selectedText}
          onEditMessage={onEditMessage}
          onDeleteMessage={onDeleteMessage}
          onSaveSelectionAsNote={handleSaveAsNote}
          onSaveMessageAsNote={handleSaveAsNote}
          onAppendSelectionToNote={handleAppendToNote}
          onAppendMessageToNote={handleAppendToNote}
        >
          <MessageItem
            message={message}
            onEditMessage={onEditMessage}
            onDeleteMessage={onDeleteMessage}
            onSelectedText={onSelectedText}
            onResendMessage={onResendMessage}
          />
        </MessageContextMenu>
      );
    },
    [
      messages,
      notes,
      selectedText,
      onEditMessage,
      onDeleteMessage,
      onResendMessage,
      handleSaveAsNote,
      handleAppendToNote,
      onSelectedText,
    ]
  );

  // Early return for empty state
  if (messages.length === 0) {
    return (
      <div
        ref={containerRef}
        className="flex-1 flex flex-col overflow-y-auto min-h-0 h-full w-full p-4"
      >
        <EmptyState />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-hidden min-h-0 h-full w-full"
    >
      <Virtuoso
        data={messages}
        totalCount={messages.length}
        itemContent={(index) => renderMessage(index)}
        followOutput={shouldAutoScroll}
        initialTopMostItemIndex={messages.length - 1}
        overscan={5}
        increaseViewportBy={{ top: 300, bottom: 300 }}
        computeItemKey={(index) => messages[index].id}
        defaultItemHeight={100}
        alignToBottom
      />
    </div>
  );
});

export const ChatMessageList = observer(ChatMessageListComponent);
