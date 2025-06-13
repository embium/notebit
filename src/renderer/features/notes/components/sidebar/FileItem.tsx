import React, { useCallback } from 'react';
import { FiFile, FiMoreVertical } from 'react-icons/fi';

// UI Components
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';

// Utils
import { cn } from '@src/renderer/utils';

// Types
import { NoteFile } from '@src/types/notes';

interface FileItemProps {
  fileItem: NoteFile;
  level: number;
  currentNotePath: string;
  newFolderData: { name: string; parentId: string | null } | null;
  draggedItemPath: string | null;
  dropTargetPath: string | null;
  setDraggedItemPath: (path: string | null) => void;
  setDropTargetPath: (path: string | null) => void;
  handleDeleteItem: (path: string, isFolder: boolean) => void;
  handleCreateRootNote: (folderId: string) => void;
  handleCreateRootFolder: (parentPath: string) => void;
  handleMoveItem: (sourceId: string, targetId: string | null) => void;
  openMoveDialog: (path: string) => void;
  onClick: () => void;
}

const FileItemComponent: React.FC<FileItemProps> = ({
  fileItem,
  level,
  currentNotePath,
  draggedItemPath,
  dropTargetPath,
  setDraggedItemPath,
  setDropTargetPath,
  handleCreateRootNote,
  handleCreateRootFolder,
  handleDeleteItem,
  handleMoveItem,
  openMoveDialog,
  onClick,
}) => {
  const isActive = currentNotePath === fileItem.path;
  const isDragged = draggedItemPath === fileItem.path;
  const isDropTarget = dropTargetPath === fileItem.path;
  const indentStyle = { paddingLeft: `${level * 12 + 8}px` };

  // Drag handlers
  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      e.dataTransfer.setData('text/plain', fileItem.path);
      setDraggedItemPath(fileItem.path);
    },
    [fileItem.path, setDraggedItemPath]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedItemPath(null);
    setDropTargetPath(null);
  }, [setDraggedItemPath, setDropTargetPath]);

  // Drop handlers
  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (draggedItemPath !== fileItem.path) {
        setDropTargetPath(fileItem.path);
      }
    },
    [draggedItemPath, fileItem.path, setDropTargetPath]
  );

  const handleDragLeave = useCallback(() => {
    setDropTargetPath(null);
  }, [setDropTargetPath]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const sourceId = e.dataTransfer.getData('text/plain');
      if (sourceId && sourceId !== fileItem.path) {
        handleMoveItem(sourceId, fileItem.parentId);
      }
      setDropTargetPath(null);
    },
    [fileItem.path, fileItem.parentId, handleMoveItem, setDropTargetPath]
  );

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          draggable
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'flex items-center w-full px-2 py-2 rounded-md cursor-pointer',
            {
              'bg-accent': isActive,
              'hover:bg-muted': !isActive,
              'opacity-50': isDragged,
              'ring-1 ring-primary/50 bg-primary/5': isDropTarget,
            }
          )}
          style={indentStyle}
          onClick={onClick}
          title={
            isDropTarget ? "Drop to move to this file's folder" : fileItem.title
          }
        >
          <FiFile
            className="mr-2 flex-shrink-0"
            size={14}
          />
          <span className="flex-grow truncate">{fileItem.title}</span>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => handleCreateRootNote(fileItem.id)}>
          New Note
        </ContextMenuItem>
        <ContextMenuItem onClick={() => handleCreateRootFolder(fileItem.path)}>
          New Folder
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={() => handleDeleteItem(fileItem.path, false)}
          variant="destructive"
        >
          Delete Note
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};

export const FileItem = FileItemComponent;
