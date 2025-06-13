// State
import {
  notesState$,
  createNote,
  openNote,
  saveCurrentNote,
  setNoteContent,
} from '@/features/notes/state/notesState';

// Services
import { NoteFile } from '@src/shared/services/notesFileService';

interface UseNoteOperationsResult {
  notes: NoteFile[];
  handleSaveAsNote: (content: string, title?: string) => void;
  handleAppendToNote: (noteId: string, content: string) => void;
}

/**
 * Hook for note operations in chat context
 */
export function useNoteOperations(): UseNoteOperationsResult {
  // Get notes from state
  const notes = notesState$.notesList.get();

  // Create a note from message content
  const handleSaveAsNote = (content: string, notePath?: string) => {
    const noteTitle = `Note from chat - ${new Date().toLocaleString()}`;
    console.log(content);

    // Create a new note and then set its content
    createNote({
      title: noteTitle,
      parentPath: notePath,
    }).then((newNote) => {
      if (newNote) {
        setNoteContent(content);
        saveCurrentNote();
      }
    });
  };

  // Append message content to an existing note
  const handleAppendToNote = (noteId: string, content: string) => {
    // Find the note path from the ID
    const notePath = notes.find((note) => note.id === noteId)?.path;
    console.log(notePath, content);

    if (notePath) {
      openNote(notePath).then(() => {
        const currentNote = notesState$.currentNote.get();
        if (currentNote) {
          const updatedContent = `${currentNote.content || ''}\n\n${content}`;
          setNoteContent(updatedContent);
          saveCurrentNote();
        }
      });
    }
  };

  return {
    notes,
    handleSaveAsNote,
    handleAppendToNote,
  };
}
