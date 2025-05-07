import { useCallback } from 'react';
import { toast } from 'sonner';

// Services
import { NoteFile } from '@shared/services/notesFileService';

// State
import {
  createNote,
  openNote,
  deleteNote,
  notesState$,
  setRequestTitleInputFocus,
} from '@/features/notes/state/notesState';

/**
 * Hook for managing note operations
 */
export function useNoteOperations(
  notesListValue: NoteFile[],
  expandParentFolders: (path: string) => void,
  scrollToItem: (path: string) => void
) {
  /**
   * Handle creating a note in the root directory
   */
  const handleCreateRootNote = useCallback(async () => {
    try {
      const newNote = await createNote({});
      if (newNote?.path) {
        scrollToItem(newNote.path);
      }
      setRequestTitleInputFocus(true);
    } catch (error) {
      console.error('Error creating root note:', error);
    }
  }, [scrollToItem]);

  /**
   * Handle creating a note in a folder
   */
  const handleCreateNoteInFolder = useCallback(
    async (folderPath: string) => {
      try {
        // Find the folder by path
        const folder = notesListValue.find(
          (note) => note.path === folderPath && note.isFolder
        );

        if (!folder) {
          console.error('Folder not found:', folderPath);
          return;
        }

        // Create a note in the folder
        const newNote = await createNote({
          parentPath: folder.path,
        });

        if (newNote?.path) {
          // Expand parent folders to make the new note visible
          expandParentFolders(newNote.path);
          // Scroll to the new note
          scrollToItem(newNote.path);
        }

        // Request focus on the title input
        setRequestTitleInputFocus(true);
      } catch (error) {
        console.error('Error creating note in folder:', error);
      }
    },
    [notesListValue, expandParentFolders, scrollToItem]
  );

  /**
   * Handle item deletion (file or folder)
   */
  const handleItemDeletion = useCallback(
    async (path: string, isFolder: boolean) => {
      try {
        await deleteNote(path);

        const currentNoteValue = notesState$.currentNote.get();
        // If the deleted item was the current note, clear the current note
        if (path === currentNoteValue.path) {
          notesState$.currentNote.set({
            id: null,
            title: '',
            content: '',
            path: null,
            unsavedChanges: false,
          });
        }

        return true;
      } catch (error) {
        console.error('Error deleting item:', error);
        toast.error(`Failed to delete ${isFolder ? 'folder' : 'note'}`);
        return false;
      }
    },
    []
  );

  return {
    handleCreateRootNote,
    handleCreateNoteInFolder,
    handleItemDeletion,
    openNote,
  };
}
