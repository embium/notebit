import React, { useCallback, useMemo, useRef, useEffect } from 'react';
import { observer } from '@legendapp/state/react';
import { toast } from 'sonner';
import { cn } from '@src/renderer/utils';

// UI Components
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';

// Components
import { FileItem } from '@/features/notes/components/sidebar/FileItem';
import { FolderItem } from '@/features/notes/components/sidebar/FolderItem';
import { NewFolderInput } from '@/features/notes/components/sidebar/NewFolderInput';
import { MoveItemDialog } from '@/features/notes/components/dialogs/MoveItemDialog';

// Hooks
import { useDragAndDrop } from '@/features/notes/hooks/useDragAndDrop';
import { useFolderOperations } from '@/features/notes/hooks/useFolderOperations';
import { useNoteOperations } from '@/features/notes/hooks/useNoteOperations';
import { useNotesScroll } from '@/features/notes/hooks/useNotesScroll';
import { useNotesDialogs } from '@/features/notes/hooks/useNotesDialogs';

// State
import { notesState$ } from '@/features/notes/state/notesState';

// Utils
import { buildNotesTree } from '@/features/notes/utils/notesTreeUtils';

// Types
import { NoteFile } from '@src/types/notes';

/**
 * NotesTabContent component displays the notes tree with folders and files
 */
const NoteTabContentComponent: React.FC = () => {
  // Get data directly from observable state
  const notesListValue = notesState$.notesList.get();
  const currentNoteValue = notesState$.currentNote.get();
  const expandedFolders = notesState$.expandedFolders.get();

  // Use a ref that points to the imperative handle instead of the input element directly
  const newFolderInputRef = useRef<HTMLInputElement | null>(null);

  // Build the tree structure for notes (standard approach, no hooks)
  const notesTree = useMemo(
    () => buildNotesTree(notesListValue),
    [notesListValue]
  );

  // Use the scroll hook
  const {
    notesAreaRef,
    handleScroll,
    scrollToItem,
    expandParentFolders,
    scrollToNewFolderInput,
  } = useNotesScroll();

  // Use the note operations hook
  const {
    handleCreateRootNote,
    handleCreateNoteInFolder,
    handleItemDeletion,
    openNote,
  } = useNoteOperations(notesListValue, expandParentFolders, scrollToItem);

  // Use the folder operations hook
  const {
    newFolderData,
    setNewFolderData,
    handleCreateRootFolder,
    handleCreateSubfolder,
    handleSaveNewFolder,
    handleCancelNewFolder,
    handleNewFolderKeyDown,
    handleFolderNameChange,
    handleToggleFolder,
  } = useFolderOperations(
    notesListValue,
    expandedFolders,
    scrollToNewFolderInput,
    newFolderInputRef
  );

  // Use the dialogs hook
  const {
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    deleteItemPath,
    setDeleteItemPath,
    deleteItemIsFolder,
    handleDeleteItem,
    confirmDeleteItem,
    moveDialogOpen,
    setMoveDialogOpen,
    moveItemPath,
    openMoveDialog,
    handleConfirmMove,
  } = useNotesDialogs(handleItemDeletion);

  // Handle the actual move operation
  const handleMoveItemImpl = useCallback(
    async (sourcePath: string, targetFolderId: string | null) => {
      try {
        // Find the target folder path if the ID is not null
        let targetPath = '\\';
        if (targetFolderId) {
          const targetFolder = notesListValue.find(
            (note) => note.id === targetFolderId
          );
          if (!targetFolder) return;
          targetPath = targetFolder.path;
        }

        // Here we'd call the actual move function
        const result = await handleConfirmMove(sourcePath, targetPath);
        return;
      } catch (error) {
        console.error('Error moving item:', error);
        toast.error('Failed to move item');
      }
    },
    [notesListValue, handleConfirmMove]
  );

  // Use the drag and drop hook
  const {
    draggedItemPath,
    setDraggedItemPath,
    dropTargetPath,
    setDropTargetPath,
    handleMoveItem,
  } = useDragAndDrop(notesListValue, notesTree, handleMoveItemImpl);

  // Recursive function to render folder items and their children
  const renderFolderContents = useCallback(
    (folderId: string, level: number) => {
      const items = notesTree[folderId] || [];

      return items.map((item) => {
        if (item.isFolder) {
          return renderFolder(item, level);
        } else {
          return (
            <FileItem
              key={item.id}
              fileItem={item}
              level={level}
              currentNotePath={currentNoteValue.path ?? ''}
              newFolderData={newFolderData}
              draggedItemPath={draggedItemPath}
              dropTargetPath={dropTargetPath}
              setDraggedItemPath={setDraggedItemPath}
              setDropTargetPath={setDropTargetPath}
              handleDeleteItem={handleDeleteItem}
              handleCreateRootNote={handleCreateRootNote}
              handleCreateRootFolder={handleCreateRootFolder}
              handleMoveItem={handleMoveItem}
              openMoveDialog={openMoveDialog}
              onClick={() => openNote(item.path)}
            />
          );
        }
      });
    },
    [
      notesTree,
      currentNoteValue.path,
      newFolderData,
      draggedItemPath,
      dropTargetPath,
      setDraggedItemPath,
      setDropTargetPath,
      handleDeleteItem,
      handleCreateNoteInFolder,
      handleCreateSubfolder,
      handleMoveItem,
      openMoveDialog,
      openNote,
    ]
  );

  // Render a folder item with its children
  const renderFolder = useCallback(
    (folderItem: NoteFile, level: number) => {
      // Get folder expanded state
      const isExpanded = expandedFolders.includes(folderItem.id);

      return (
        <React.Fragment key={folderItem.id}>
          <FolderItem
            folderItem={folderItem}
            level={level}
            currentNotePath={currentNoteValue.path ?? ''}
            newFolderData={newFolderData}
            expandedFolders={expandedFolders}
            draggedItemPath={draggedItemPath}
            dropTargetPath={dropTargetPath}
            handleToggleFolder={handleToggleFolder}
            handleDeleteItem={handleDeleteItem}
            handleCreateNoteInFolder={handleCreateNoteInFolder}
            handleCreateSubfolder={handleCreateSubfolder}
            setDropTargetPath={setDropTargetPath}
            setDraggedItemPath={setDraggedItemPath}
            handleMoveItem={handleMoveItem}
            openMoveDialog={openMoveDialog}
            renderChildren={() => {
              // Simply return the children if expanded, no hooks called here
              return isExpanded ? (
                <div className="folder-children">
                  {renderFolderContents(folderItem.id, level + 1)}
                </div>
              ) : null;
            }}
          />
          {newFolderData && newFolderData.parentId === folderItem.path && (
            <NewFolderInput
              name={newFolderData.name}
              level={level + 1}
              onChange={handleFolderNameChange}
              onKeyDown={handleNewFolderKeyDown}
              onBlur={handleSaveNewFolder}
              newFolderInputRef={newFolderInputRef}
            />
          )}
        </React.Fragment>
      );
    },
    [
      expandedFolders,
      currentNoteValue.path,
      newFolderData,
      draggedItemPath,
      dropTargetPath,
      handleToggleFolder,
      handleDeleteItem,
      handleCreateNoteInFolder,
      handleCreateSubfolder,
      setDropTargetPath,
      handleMoveItem,
      openMoveDialog,
      renderFolderContents,
      handleFolderNameChange,
      handleNewFolderKeyDown,
      handleSaveNewFolder,
      newFolderInputRef,
    ]
  );

  return (
    <div
      className="relative flex-grow overflow-y-auto p-2"
      ref={notesAreaRef}
      onScroll={handleScroll}
    >
      {/* List of notes/folders */}
      <div
        className={cn('space-y-1 min-h-[40px] relative z-10', {
          'ring-2 ring-primary ring-inset rounded-md p-1':
            dropTargetPath === 'root',
        })}
      >
        {renderFolderContents('root', 0)}
        {newFolderData && newFolderData.parentId === null && (
          <NewFolderInput
            name={newFolderData.name}
            level={0}
            onChange={handleFolderNameChange}
            onKeyDown={handleNewFolderKeyDown}
            onBlur={handleSaveNewFolder}
            newFolderInputRef={newFolderInputRef}
          />
        )}
      </div>
      {/* Invisible overlay for background context menu */}
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className="absolute inset-0 z-0"
            style={{ pointerEvents: 'auto' }}
            aria-label="Sidebar background context menu trigger"
            onDragOver={(e) => {
              e.preventDefault();
              // We should show the drop target regardless of draggedItemPath
              // to handle both files and folders
              setDropTargetPath('root');
            }}
            onDragLeave={() => {
              setDropTargetPath(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              const sourceId = e.dataTransfer.getData('text/plain');
              if (sourceId) {
                // Pass null as target ID to move to root
                handleMoveItem(sourceId, null);
              }
              setDropTargetPath(null);
              setDraggedItemPath(null);
            }}
          />
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={handleCreateRootNote}>
            New Note
          </ContextMenuItem>
          <ContextMenuItem onClick={handleCreateRootFolder}>
            New Folder
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {deleteItemIsFolder ? 'Folder' : 'Note'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteItemIsFolder
                ? 'Are you sure you want to delete the folder and all its contents? This action cannot be undone.'
                : 'Are you sure you want to delete the note? This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteItem}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Move Item Dialog */}
      <MoveItemDialog
        open={moveDialogOpen}
        onOpenChange={setMoveDialogOpen}
        itemPath={moveItemPath}
        notes={notesListValue}
        onConfirm={handleConfirmMove}
      />
    </div>
  );
};

export const NoteTabContent = observer(NoteTabContentComponent);
