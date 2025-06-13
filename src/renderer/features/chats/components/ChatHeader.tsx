import React from 'react';
import { GoSidebarCollapse } from 'react-icons/go';

// State
import { Chat } from '@/features/chats/state/chatsState';

interface ChatHeaderProps {
  isMiddlebarCollapsed: boolean;
  onToggleMiddleSidebar: () => void;
  activeChat: Chat | null;
}

const ChatHeaderComponent: React.FC<ChatHeaderProps> = ({
  isMiddlebarCollapsed,
  onToggleMiddleSidebar,
  activeChat,
}) => {
  return (
    <div className="h-[60px] flex items-center justify-between px-3 border-b">
      <div className="flex items-center flex-1">
        {isMiddlebarCollapsed && (
          <button
            onClick={onToggleMiddleSidebar}
            className="mr-2 b-0 bg-transparent border-none shadow-none hover:bg-accent"
          >
            <GoSidebarCollapse size={20} />
          </button>
        )}
        <div className="flex-1 font-medium text-lg px-2">
          {activeChat?.title || 'New Chat'}
        </div>
        <div className="w-8" />
      </div>
    </div>
  );
};

export const ChatHeader = ChatHeaderComponent;
