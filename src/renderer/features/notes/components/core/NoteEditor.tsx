import React from 'react';
import { Editor, EditorContent } from '@tiptap/react';

// Hooks
import { useNoteEditor } from '@/features/notes/hooks/useNoteEditor';

// Sub-Components
import { MenuBar } from './MenuBar';
import { NoteContextMenu } from './NoteContextMenu';
import { observer } from '@legendapp/state/react';

interface NoteEditorProps {
  editor: Editor | null;
  selectedText: string;
  hasChats: boolean;
  filteredChats: Array<{ id: string; title: string }>;
  onSendToNewChat: () => void;
  onSendToChat: (chatId: string) => void;
}

/**
 * Note editor component with toolbar and context menu
 * Wraps Tiptap editor with appropriate UI and functionality
 */
const NoteEditorComponent: React.FC<NoteEditorProps> = ({
  editor,
  selectedText,
  hasChats,
  filteredChats,
  onSendToNewChat,
  onSendToChat,
}) => {
  return (
    <>
      {/* Editor toolbar */}
      <MenuBar editor={editor} />

      {/* Editor with context menu */}
      <NoteContextMenu
        hasChats={hasChats}
        hasSelectedText={!!selectedText}
        filteredChats={filteredChats}
        onSendToNewChat={onSendToNewChat}
        onSendToChat={onSendToChat}
      >
        <EditorContent
          editor={editor}
          className="prose dark:prose-invert max-w-none flex-1 h-full p-4"
        />
      </NoteContextMenu>
    </>
  );
};

export const NoteEditor = observer(NoteEditorComponent);
