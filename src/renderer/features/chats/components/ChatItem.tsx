import React from 'react';
import { FiMessageSquare } from 'react-icons/fi';
import { observer } from '@legendapp/state/react';

// UI Components
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';

// State
import { Chat } from '@/features/chats/state/chatsState';

interface ChatItemProps {
  chat: Chat;
  isActive: boolean;
  isEditing: boolean;
  editTitle: string;
  renameInputRef: React.RefObject<HTMLInputElement>;
  onOpenChat: (chatId: string) => void;
  onRenameChat: (chatId: string) => void;
  onClearChat: (chatId: string) => void;
  onDeleteChat: (chatId: string) => void;
  onSaveTitle: (chatId: string, title: string) => void;
  onEditTitleChange: (title: string) => void;
  onKeyPress: (e: React.KeyboardEvent, chatId: string) => void;
}

/**
 * Individual chat item component
 * Renders a single chat in the list with context menu
 */
const ChatItemComponent: React.FC<ChatItemProps> = ({
  chat,
  isActive,
  isEditing,
  editTitle,
  renameInputRef,
  onOpenChat,
  onRenameChat,
  onClearChat,
  onDeleteChat,
  onSaveTitle,
  onEditTitleChange,
  onKeyPress,
}) => {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={`flex items-center py-2 px-3 hover:bg-muted/50 cursor-pointer rounded-md ${
            isActive ? 'bg-muted' : ''
          }`}
          onClick={() => onOpenChat(chat.id)}
        >
          {isEditing ? (
            <input
              ref={renameInputRef}
              type="text"
              className="w-full px-2 py-1 bg-background border border-input rounded-md"
              value={editTitle}
              onChange={(e) => onEditTitleChange(e.target.value)}
              onKeyDown={(e) => onKeyPress(e, chat.id)}
              onBlur={() => onSaveTitle(chat.id, editTitle)}
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div className="flex items-center flex-1 overflow-hidden">
              <FiMessageSquare className="mr-2 flex-shrink-0 text-muted-foreground" />
              <span className="truncate">{chat.title}</span>
            </div>
          )}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => onRenameChat(chat.id)}>
          Rename Chat
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => onClearChat(chat.id)}>
          Clear Chat
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => onDeleteChat(chat.id)}
          className="text-red-500"
        >
          Delete Chat
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};

export const ChatItem = observer(ChatItemComponent);
