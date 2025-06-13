import { useMemo, useCallback } from 'react';

// Services
import { NoteFile } from '@src/shared/services/notesFileService';

interface UseNoteIntegrationProps {
  notesList: NoteFile[];
  value: string;
  onChange: (value: string) => void;
  getContent: (noteId: string) => Promise<string>;
}

/**
 * Hook for managing note integration with chat input
 * Handles note selection and building folder/note structures
 */
export function useNoteIntegration({
  notesList,
  value,
  onChange,
  getContent,
}: UseNoteIntegrationProps) {
  // Handle selecting a note to add to chat input
  const handleSelectedNote = useCallback(
    async (noteId: string) => {
      const content = await getContent(noteId);
      if (value) {
        onChange(value + '\n\n' + content);
      } else {
        onChange(content);
      }
    },
    [getContent, onChange, value]
  );

  // Filter and sort root-level notes
  const rootNotes = useMemo(() => {
    return notesList
      .filter(
        (note) =>
          note &&
          !note.isFolder &&
          (note.parentId === null || note.parentId === undefined)
      )
      .sort((a, b) =>
        a.title.localeCompare(b.title, undefined, {
          numeric: true,
          sensitivity: 'base',
        })
      );
  }, [notesList]);

  // Build folder structure for navigation
  const folderStructure = useMemo(() => {
    const structure = new Map();
    notesList.forEach((note) => {
      if (note.isFolder) {
        const parentId = note.parentId || null;
        if (!structure.has(parentId)) {
          structure.set(parentId, []);
        }
        structure.get(parentId).push(note);
      }
    });

    // Sort folders at each level
    structure.forEach((folders) => {
      folders.sort((a: NoteFile, b: NoteFile) =>
        a.title.localeCompare(b.title, undefined, {
          numeric: true,
          sensitivity: 'base',
        })
      );
    });

    return structure;
  }, [notesList]);

  // Build file structure for navigation
  const fileStructure = useMemo(() => {
    const structure = new Map();
    notesList.forEach((note) => {
      if (!note.isFolder) {
        const parentId = note.parentId || null;
        if (!structure.has(parentId)) {
          structure.set(parentId, []);
        }
        structure.get(parentId).push(note);
      }
    });

    // Sort files at each level
    structure.forEach((files) => {
      files.sort((a: NoteFile, b: NoteFile) =>
        a.title.localeCompare(b.title, undefined, {
          numeric: true,
          sensitivity: 'base',
        })
      );
    });

    return structure;
  }, [notesList]);

  return {
    handleSelectedNote,
    rootNotes,
    folderStructure,
    fileStructure,
    hasNotes: notesList.length > 0,
  };
}
