import React, { useCallback } from 'react';

// Types
import { Message } from '@src/types/chats';

// Utils
import { cn } from '@src/renderer/utils';

// Components
import { MessageContent } from '@/features/chats/components/MessageItem/MessageContent';
import { MessageActions } from '@/features/chats/components/MessageItem/MessageActions';

// Hooks
import { useMessageData } from '@/features/chats/hooks/useMessageData';

interface MessageItemProps {
  message: Message;
  onEditMessage?: (messageId: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onSelectedText?: (text: string) => void;
  onResendMessage?: (messageId: string) => void;
}

const MessageItem: React.FC<MessageItemProps> = ({
  message,
  onEditMessage,
  onDeleteMessage,
  onSelectedText,
  onResendMessage,
}) => {
  // Use our custom hook to get optimized message data
  const { textContent, messageRoleInfo } = useMessageData(message);
  const { isUserMessage, displayName, roleClass, model } = messageRoleInfo;

  const handleSelectedText = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const selection = window.getSelection();
      if (selection && selection.toString()) {
        onSelectedText?.(selection.toString());
      } else {
        onSelectedText?.('');
      }
    },
    [onSelectedText]
  );

  return (
    <div
      className={cn(
        'message-item group py-3 px-4 hover:bg-accent/40 transition-colors select-text',
        roleClass
      )}
      onClick={handleSelectedText}
    >
      <div className="flex justify-between items-start">
        <div className="message-role font-semibold text-sm text-muted-foreground mb-1">
          {displayName}
          {!isUserMessage && model && (
            <span className="text-xs ml-2 opacity-70">via {model}</span>
          )}
        </div>
      </div>

      <MessageContent message={message} />
      <MessageActions
        messageId={message.id}
        messageContent={textContent}
        isUserMessage={isUserMessage}
        onEditMessage={onEditMessage}
        onDeleteMessage={onDeleteMessage}
        onResendMessage={onResendMessage}
      />
    </div>
  );
};

export default React.memo(MessageItem);
