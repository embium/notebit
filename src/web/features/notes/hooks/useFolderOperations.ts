import { useState, useCallback } from 'react';
import { toast } from 'sonner';

// Services
import { NoteFile } from '@shared/services/notesFileService';

// State
import {
  createFolder,
  notesState$,
  toggleFolderExpanded,
  findNextAvailableUntitledName,
} from '@/features/notes/state/notesState';

/**
 * Hook for managing folder operations
 */
export function useFolderOperations(
  notesListValue: NoteFile[],
  expandedFoldersValue: string[],
  scrollToNewFolderInput: (inputRef: any) => void,
  newFolderInputRef: React.RefObject<HTMLInputElement | null>
) {
  // State for new folder creation
  const [newFolderData, setNewFolderData] = useState<{
    parentId: string | null;
    name: string;
  } | null>(null);

  /**
   * Handle creating a folder in the root directory
   */
  const handleCreateRootFolder = useCallback(() => {
    // First set the folder data to trigger rendering
    setNewFolderData({
      parentId: null,
      name: findNextAvailableUntitledName(true),
    });

    // More aggressive focus strategy with multiple attempts at different intervals

    setTimeout(() => {
      if (newFolderInputRef.current) {
        scrollToNewFolderInput(newFolderInputRef.current);
        autoFocusInput(newFolderInputRef.current);
      }
    }, 100);
  }, [newFolderInputRef]);

  const autoFocusInput = (inputRef: HTMLInputElement) => {
    inputRef.focus();
    inputRef.select();
  };

  /**
   * Handle creating a subfolder
   */
  const handleCreateSubfolder = useCallback(
    (parentPath: string) => {
      const parentNote = notesListValue.find(
        (note) => note.path === parentPath
      );
      if (!parentNote) return;

      // First set the folder data to trigger rendering
      setNewFolderData({
        parentId: parentPath,
        name: findNextAvailableUntitledName(true),
      });

      setTimeout(() => {
        if (newFolderInputRef.current) {
          scrollToNewFolderInput(newFolderInputRef.current);
          autoFocusInput(newFolderInputRef.current);
        }
      }, 100);
    },
    [notesListValue, newFolderInputRef]
  );

  /**
   * Handle canceling folder creation
   */
  const handleCancelNewFolder = useCallback(() => {
    setNewFolderData(null);
  }, []);

  /**
   * Handle saving a new folder
   */
  const handleSaveNewFolder = useCallback(async () => {
    if (!newFolderData) return;

    // We don't have direct access to the input value via the handle
    // So we have to use the name from the state
    const { parentId, name } = newFolderData;
    const trimmedName = name.trim();

    // If the name is empty, cancel folder creation
    if (!trimmedName) {
      setNewFolderData(null);
      return;
    }

    try {
      // Use empty string for root folder creation to ensure platform compatibility
      const parentPath = parentId === null ? '' : parentId;

      const newFolder = await createFolder({
        name: trimmedName,
        parentPath,
      });

      if (newFolder) {
        // Add the new folder's ID to expanded folders
        if (!expandedFoldersValue.includes(newFolder.id)) {
          notesState$.expandedFolders.set([
            ...expandedFoldersValue,
            newFolder.id,
          ]);
        }

        // Clear the new folder data
        setNewFolderData(null);

        // If it's a subfolder, make sure the parent folder is expanded
        if (parentId) {
          const parentNote = notesListValue.find(
            (note) => note.path === parentId
          );
          if (parentNote && !expandedFoldersValue.includes(parentNote.id)) {
            notesState$.expandedFolders.set([
              ...expandedFoldersValue,
              parentNote.id,
            ]);
          }
        }
      }
    } catch (error) {
      console.error('Error creating folder:', error);
      toast.error('Failed to create folder');
    }
  }, [newFolderData, expandedFoldersValue, notesListValue]);

  /**
   * Handle key events in the new folder input
   */
  const handleNewFolderKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault(); // Prevent form submission
        e.stopPropagation(); // Prevent event bubbling
        handleSaveNewFolder();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleCancelNewFolder();
      }
    },
    [handleSaveNewFolder, handleCancelNewFolder]
  );

  /**
   * Handle new folder name change
   */
  const handleFolderNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;

      if (newFolderData) {
        const updatedData = { ...newFolderData, name: newValue };
        setNewFolderData(updatedData);
      }
    },
    [newFolderData]
  );

  /**
   * Handle toggling a folder's expanded state
   */
  const handleToggleFolder = useCallback((folderId: string) => {
    toggleFolderExpanded(folderId);
  }, []);

  return {
    newFolderData,
    setNewFolderData,
    handleCreateRootFolder,
    handleCreateSubfolder,
    handleSaveNewFolder,
    handleCancelNewFolder,
    handleNewFolderKeyDown,
    handleFolderNameChange,
    handleToggleFolder,
  };
}
