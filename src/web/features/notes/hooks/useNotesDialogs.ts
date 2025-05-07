import { useState, useCallback } from 'react';
import { toast } from 'sonner';

// State
import { loadNotes } from '@/features/notes/state/notesState';

// TRPC
import { trpcProxyClient } from '@shared/config';

/**
 * Hook for managing note dialogs like delete confirmation and move dialogs
 */
export function useNotesDialogs(
  handleItemDeletion: (path: string, isFolder: boolean) => Promise<boolean>
) {
  // State for delete dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteItemPath, setDeleteItemPath] = useState<string | null>(null);
  const [deleteItemIsFolder, setDeleteItemIsFolder] = useState(false);

  // State for move dialog
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [moveItemPath, setMoveItemPath] = useState<string | null>(null);

  /**
   * Open the delete dialog
   */
  const handleDeleteItem = useCallback(
    async (path: string, isFolder: boolean) => {
      setIsDeleteDialogOpen(true);
      setDeleteItemPath(path);
      setDeleteItemIsFolder(isFolder);
    },
    []
  );

  /**
   * Confirm deletion of an item
   */
  const confirmDeleteItem = useCallback(async () => {
    if (!deleteItemPath) return;

    const success = await handleItemDeletion(
      deleteItemPath,
      deleteItemIsFolder
    );

    // Close the dialog regardless of success
    setIsDeleteDialogOpen(false);
    setDeleteItemPath(null);
    setDeleteItemIsFolder(false);
  }, [deleteItemPath, deleteItemIsFolder, handleItemDeletion]);

  /**
   * Open the move dialog
   */
  const openMoveDialog = useCallback((itemPath: string) => {
    setMoveDialogOpen(true);
    setMoveItemPath(itemPath);
  }, []);

  /**
   * Handle confirming a move operation
   */
  const handleConfirmMove = useCallback(
    async (sourcePath: string, targetPath: string) => {
      try {
        // Find target folder ID from targetPath (You'd need the full notes list here)
        // This would be implemented in the component where this hook is used

        // Close the dialog
        setMoveDialogOpen(false);
        setMoveItemPath(null);

        if (!sourcePath || !targetPath) {
          toast.error('Invalid source or target path');
          return false;
        }

        // Use trpcProxyClient instead of direct moveItem function
        await trpcProxyClient.notes.moveItem.mutate({
          sourcePath,
          targetPath,
        });

        // Reload notes after move
        await loadNotes();

        return { sourcePath, targetPath };
      } catch (error) {
        console.error('Error confirming move:', error);
        toast.error('Failed to move item');
        return null;
      }
    },
    []
  );

  return {
    // Delete dialog
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    deleteItemPath,
    setDeleteItemPath,
    deleteItemIsFolder,
    handleDeleteItem,
    confirmDeleteItem,

    // Move dialog
    moveDialogOpen,
    setMoveDialogOpen,
    moveItemPath,
    openMoveDialog,
    handleConfirmMove,
  };
}
