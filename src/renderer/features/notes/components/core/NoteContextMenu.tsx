import React from 'react';

// UI Components
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { observer } from '@legendapp/state/react';

interface ChatItem {
  id: string;
  title: string;
}

interface NoteContextMenuProps {
  children: React.ReactNode;
  hasChats: boolean;
  hasSelectedText: boolean;
  filteredChats: ChatItem[];
  onSendToNewChat: () => void;
  onSendToChat: (chatId: string) => void;
}

/**
 * Context menu component for the note editor
 * Provides options for sending note content to chats
 */
const NoteContextMenuComponent: React.FC<NoteContextMenuProps> = ({
  children,
  hasChats,
  hasSelectedText,
  filteredChats,
  onSendToNewChat,
  onSendToChat,
}) => {
  return (
    <ContextMenu>
      <ContextMenuTrigger className="flex-1 h-full overflow-auto scrollbar-visible">
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent>
        {hasChats && hasSelectedText && (
          <>
            <ContextMenuSub>
              <ContextMenuItem onClick={onSendToNewChat}>
                Send selection to new chat
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuSubTrigger>
                Send selection to chat
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-48">
                {filteredChats.map((chat) => (
                  <ContextMenuItem
                    key={chat.id}
                    onClick={() => onSendToChat(chat.id)}
                  >
                    {chat.title}
                  </ContextMenuItem>
                ))}
              </ContextMenuSubContent>
            </ContextMenuSub>
          </>
        )}

        {!hasSelectedText && hasChats && (
          <>
            <ContextMenuSub>
              <ContextMenuItem onClick={onSendToNewChat}>
                Send note to new chat
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuSubTrigger>Send note to chat</ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-48">
                {filteredChats.map((chat) => (
                  <ContextMenuItem
                    key={chat.id}
                    onClick={() => onSendToChat(chat.id)}
                  >
                    {chat.title}
                  </ContextMenuItem>
                ))}
              </ContextMenuSubContent>
            </ContextMenuSub>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
};

export const NoteContextMenu = observer(NoteContextMenuComponent);
