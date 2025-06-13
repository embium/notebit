import { useCallback, useMemo } from 'react';
import { Editor } from '@tiptap/react';
import { toast } from 'sonner';

// State
import { createChat, sendNoteToChat } from '@/features/chats/state/chatsState';
import { defaultPromptsState$ } from '@/features/settings/state/defaultPromptsState';

interface UseChatIntegrationProps {
  noteId: string | null;
  noteTitle: string;
  noteContent: string;
  selectedText: string;
  editor: Editor | null;
}

/**
 * Custom hook for handling note-to-chat integration functionality
 *
 * @param props - Object containing note data and editor instance
 * @returns Object containing chat integration handlers
 */
export function useChatIntegration(props: UseChatIntegrationProps) {
  const { noteId, noteTitle, noteContent, selectedText, editor } = props;
  const notePrompt = defaultPromptsState$.note.get();

  // Handle sending a note to a new chat
  const handleSendToNewChat = useCallback(() => {
    if (!noteContent.trim()) {
      toast.error('Note is empty');
      return;
    }

    const newChat = createChat(noteTitle);
    if (newChat) {
      const content = editor ? editor.getText() : noteContent;
      sendNoteToChat({
        chatId: newChat.id,
        content: notePrompt.replace('[NOTE_CONTENT]', content),
      });
      return newChat.id;
    }
    return null;
  }, [noteTitle, noteContent, editor]);

  // Handle sending text to an existing chat
  const handleSendToChat = useCallback(
    (chatId: string) => {
      if (selectedText) {
        sendNoteToChat({
          chatId,
          content: notePrompt.replace('[NOTE_CONTENT]', selectedText),
        });
        return true;
      } else if (noteContent) {
        const content = editor ? editor.getText() : noteContent;
        sendNoteToChat({
          chatId,
          content: `${notePrompt} \n\n ${content}`,
        });
        return true;
      } else {
        toast.error('Note is empty');
        return false;
      }
    },
    [selectedText, noteContent, editor]
  );

  return {
    handleSendToNewChat,
    handleSendToChat,
  };
}
