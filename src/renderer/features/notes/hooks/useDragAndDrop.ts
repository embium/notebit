import { useState, useCallback } from 'react';
import { toast } from 'sonner';

// Services
import { NoteFile } from '@shared/services/notesFileService';

/**
 * Hook for managing drag and drop operations in the notes tree
 */
export function useDragAndDrop(
  notesListValue: NoteFile[],
  notesTree: Record<string, NoteFile[]>,
  handleMoveItemCallback: (
    sourcePath: string,
    targetFolderId: string | null
  ) => Promise<void>
) {
  // Local state for drag and drop
  const [draggedItemPath, setDraggedItemPath] = useState<string | null>(null);
  const [dropTargetPath, setDropTargetPath] = useState<string | null>(null);

  /**
   * Handles the actual item move operation
   */
  const handleMoveItem = useCallback(
    async (sourcePath: string, targetFolderId: string | null) => {
      if (!sourcePath) return;

      // Don't allow moving an item to itself
      const sourceNote = notesListValue.find(
        (note) => note.path === sourcePath
      );
      if (!sourceNote) return;

      // If target is root, check if item is already at root
      if (targetFolderId === null) {
        if (sourceNote.parentId === null) {
          toast.info('Item is already at root level');
          return;
        }
      } else {
        // Check if item is already in the target folder
        if (sourceNote.parentId === targetFolderId) {
          toast.info('Item is already in this folder');
          return;
        }

        // If moving a folder, don't allow moving it to one of its descendants
        if (sourceNote.isFolder) {
          // Build a set of all descendant folder IDs
          const descendants = new Set<string>();
          const processFolder = (folderId: string) => {
            descendants.add(folderId);
            const children = notesTree[folderId] || [];
            children
              .filter((child) => child.isFolder)
              .forEach((child) => processFolder(child.id));
          };
          processFolder(sourceNote.id);

          if (descendants.has(targetFolderId)) {
            toast.error('Cannot move a folder into its own subfolder');
            return;
          }
        }
      }

      // Call the actual handler passed from the parent
      await handleMoveItemCallback(sourcePath, targetFolderId);
    },
    [notesListValue, notesTree, handleMoveItemCallback]
  );

  return {
    draggedItemPath,
    setDraggedItemPath,
    dropTargetPath,
    setDropTargetPath,
    handleMoveItem,
  };
}
