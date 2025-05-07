/**
 * NotesScreen component
 * Main screen for the notes feature, implements the notes interface
 */

import React, { useEffect, useMemo, useState } from 'react';
import { observer } from '@legendapp/state/react';
import { GoSidebarCollapse } from 'react-icons/go';

// Styles
import 'katex/dist/katex.min.css';
import '../styles/tiptap.css';

// State
import {
  setActiveTab,
  requestTitleInputFocus,
  notesState$,
} from '../state/notesState';

// Hooks
import { useNoteTitle } from '../hooks/useNoteTitle';
import { useChatIntegration } from '../hooks/useChatIntegration';

// Components
import { NoteEditor } from '../components/core/NoteEditor';

// State
import { chatsList, chatsState$ } from '../../chats/state/chatsState';

// Interface for component props
interface NotesScreenProps {
  isMiddlebarCollapsed: boolean;
  onToggleMiddleSidebar: () => void;
  onSetActiveTab: (tab: 'chats' | 'notes') => void;
}

/**
 * NotesScreen component
 * Main notes interface with editor and toolbar
 */
const NoteScreenComponent: React.FC<NotesScreenProps> = ({
  isMiddlebarCollapsed,
  onToggleMiddleSidebar,
  onSetActiveTab,
}) => {
  const [showDebugger, setShowDebugger] = useState(false);

  // Get current note from state
  const currentNoteValue = notesState$.currentNote.get();

  // Get chat-related state
  const chatsListValue = chatsState$.chatsList.get();
  const hasChats = useMemo(() => chatsListValue.length > 0, [chatsListValue]);

  // Should focus title input
  const shouldFocusTitleInput = requestTitleInputFocus.get();

  // Use the title management hook
  const {
    title: noteTitle,
    isEditing,
    titleInputRef,
    handleTitleChange,
    handleTitleBlur,
    handleTitleFocus,
    handleTitleKeyDown,
  } = useNoteTitle(currentNoteValue.title, shouldFocusTitleInput);

  // Get filtered chats for the context menu
  const filteredChats = useMemo(() => {
    const chats = chatsListValue || [];
    return chats.filter((chat) => {
      if (!chat) return false;
      return typeof chat.id === 'string' && typeof chat.title === 'string';
    });
  }, [chatsListValue]);

  // Use the chat integration hook
  const { handleSendToNewChat, handleSendToChat } = useChatIntegration({
    noteId: currentNoteValue.id,
    noteTitle: currentNoteValue.title,
    noteContent: currentNoteValue.content,
    selectedText: '', // This is managed inside the NoteEditor component
    editor: null, // This is managed inside the NoteEditor component
  });

  // Handle sending note to chat with tab change
  const handleSendToChatWithTabChange = (chatId: string) => {
    const success = handleSendToChat(chatId);
    if (success) {
      onSetActiveTab('chats');
    }
  };

  // Handle sending to new chat with tab change
  const handleSendToNewChatWithTabChange = () => {
    const newChatId = handleSendToNewChat();
    if (newChatId) {
      onSetActiveTab('chats');
    }
  };

  // Set active tab when component mounts
  useEffect(() => {
    setActiveTab('notes');
  }, []);

  return (
    <div className="h-full flex flex-col">
      {/* Notes header with title and controls */}
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
          <div className="flex-1">
            <input
              type="text"
              ref={titleInputRef}
              className="w-full py-1 px-2 font-medium text-lg bg-transparent border border-transparent focus:border-input focus:ring-0 rounded-md"
              value={noteTitle}
              onChange={handleTitleChange}
              onBlur={handleTitleBlur}
              onFocus={handleTitleFocus}
              onKeyDown={handleTitleKeyDown}
              placeholder="Note title"
            />
          </div>
          <div className="w-8" />
        </div>
      </div>

      {/* Note Editor (includes toolbar and context menu) */}
      <NoteEditor
        content={currentNoteValue.content}
        hasChats={hasChats}
        filteredChats={filteredChats}
        onSendToNewChat={handleSendToNewChatWithTabChange}
        onSendToChat={handleSendToChatWithTabChange}
      />
    </div>
  );
};

export const NoteScreen = observer(NoteScreenComponent);
