import React, { useState, useEffect, useMemo } from 'react';
import { FiFolder } from 'react-icons/fi';

// UI Components
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

// Types
import { NoteFile } from '@shared/types/notes';

// Utils
import { buildNotesTree } from '../../utils/notesTreeUtils';

interface MoveItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemPath: string | null;
  notes: NoteFile[];
  onConfirm: (sourcePath: string, targetPath: string) => void;
}

const MoveItemDialogComponent: React.FC<MoveItemDialogProps> = ({
  open,
  onOpenChange,
  itemPath,
  notes,
  onConfirm,
}) => {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [itemName, setItemName] = useState<string>('');

  // Reset selection when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedFolderId(null);
      // Find the item name based on path
      if (itemPath) {
        const item = notes.find((note) => note.path === itemPath);
        setItemName(item?.title || 'item');
      }
    }
  }, [open, itemPath, notes]);

  // Build tree from notes
  const folderTree = useMemo(() => {
    // Filter out only folders
    const folders = notes.filter((note) => note.isFolder);
    return buildNotesTree(folders);
  }, [notes]);

  // Get the item that we're moving
  const moveItem = useMemo(() => {
    if (!itemPath) return null;
    return notes.find((note) => note.path === itemPath);
  }, [itemPath, notes]);

  // Handle confirming the move
  const handleConfirm = () => {
    if (itemPath) {
      let targetPath = '\\'; // Root path
      if (selectedFolderId) {
        const targetFolder = notes.find((note) => note.id === selectedFolderId);
        if (targetFolder) {
          targetPath = targetFolder.path;
        }
      }
      onConfirm(itemPath, targetPath);
    }
    onOpenChange(false);
  };

  // Check if we can move to the selected folder
  const canMove = useMemo(() => {
    if (!moveItem || !itemPath) return false;

    // Get selected folder
    let targetFolder: NoteFile | undefined;
    if (selectedFolderId) {
      targetFolder = notes.find((note) => note.id === selectedFolderId);
    }

    // Don't allow moving a folder inside itself or its children
    if (moveItem.isFolder) {
      // Check if the target is the same folder
      if (selectedFolderId === moveItem.id) {
        return false;
      }

      // Check if the target is a descendant of the folder
      if (targetFolder && targetFolder.path.startsWith(moveItem.path)) {
        return false;
      }
    }

    // Don't allow moving to the current parent folder (no change)
    const currentParentPath = itemPath.substring(0, itemPath.lastIndexOf('\\'));
    if (targetFolder && targetFolder.path === currentParentPath) {
      return false;
    }
    if (!selectedFolderId && currentParentPath === '') {
      return false;
    }

    return true;
  }, [moveItem, itemPath, selectedFolderId, notes]);

  // Recursive function to render the folder tree
  const renderFolderTree = (
    parentId: string = 'root',
    level: number = 0
  ): React.ReactNode => {
    const children = folderTree[parentId] || [];

    return (
      <>
        {children.map((folder) => {
          const isSelected = selectedFolderId === folder.id;
          const isPreviousParent =
            itemPath &&
            itemPath.substring(0, itemPath.lastIndexOf('\\')) === folder.path;

          // Skip the item itself and its children if it's a folder
          if (
            moveItem &&
            moveItem.isFolder &&
            folder.path.startsWith(moveItem.path)
          ) {
            return null;
          }

          return (
            <React.Fragment key={folder.id}>
              <div
                className={`flex items-center px-2 py-1 rounded cursor-pointer ${
                  isSelected ? 'bg-accent' : 'hover:bg-muted'
                } ${
                  isPreviousParent && !isSelected ? 'text-muted-foreground' : ''
                }`}
                style={{ paddingLeft: `${level * 16 + 12}px` }}
                onClick={() => setSelectedFolderId(folder.id)}
              >
                <FiFolder
                  className="mr-2"
                  size={16}
                />
                <span className="truncate">{folder.title}</span>
              </div>
              {renderFolderTree(folder.id, level + 1)}
            </React.Fragment>
          );
        })}
      </>
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move {itemName}</DialogTitle>
          <DialogDescription>
            Select a folder to move this item to
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[300px] overflow-y-auto border rounded p-2 my-3">
          {/* Root folder option */}
          <div
            className={`flex items-center px-2 py-1 rounded cursor-pointer ${
              selectedFolderId === null ? 'bg-accent' : 'hover:bg-muted'
            }`}
            onClick={() => setSelectedFolderId(null)}
          >
            <FiFolder
              className="mr-2"
              size={16}
            />
            <span>Root</span>
          </div>

          {/* Folder tree */}
          {renderFolderTree()}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!canMove}
          >
            Move
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const MoveItemDialog = MoveItemDialogComponent;
