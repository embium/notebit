// Services

import { NoteFile } from '@shared/services/notesFileService';

/**
 * Build a notes tree structure from a flat list of notes
 */
export function buildNotesTree(
  notesListValue: NoteFile[]
): Record<string, NoteFile[]> {
  const treeData: Record<string, NoteFile[]> = {};

  // Group notes by parent ID
  notesListValue.forEach((note) => {
    const parentId = note.parentId || 'root';
    if (!treeData[parentId]) {
      treeData[parentId] = [];
    }
    treeData[parentId].push(note);
  });

  // Sort each group alphabetically, folders first
  Object.keys(treeData).forEach((parentId) => {
    treeData[parentId].sort((a: NoteFile, b: NoteFile) => {
      // Sort by type (folders first) then by title
      if (a.isFolder !== b.isFolder) {
        return a.isFolder ? -1 : 1;
      }

      // Then by title
      return compareNotesByTitle(a, b);
    });
  });

  return treeData;
}

/**
 * Compare two notes by title for sorting
 */
export function compareNotesByTitle(a: NoteFile, b: NoteFile): number {
  return a.title.localeCompare(b.title, undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

/**
 * Extract folder path from a file path
 */
export function getFolderPath(filePath: string): string {
  const pathParts = filePath.split('\\');
  pathParts.pop(); // Remove the last part (file name)
  return pathParts.join('\\');
}
