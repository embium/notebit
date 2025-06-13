import React, { useCallback } from 'react';
import {
  FiFolder,
  FiFolderPlus,
  FiFilePlus,
  FiMoreVertical,
  FiChevronRight,
} from 'react-icons/fi';

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

interface FolderItemProps {
  folderItem: NoteFile;
  level: number;
  currentNotePath: string;
  newFolderData: { name: string; parentId: string | null } | null;
  expandedFolders: string[];
  draggedItemPath: string | null;
  dropTargetPath: string | null;
  handleToggleFolder: (folderId: string) => void;
  handleDeleteItem: (path: string, isFolder: boolean) => void;
  handleCreateNoteInFolder: (folderId: string) => void;
  handleCreateSubfolder: (parentPath: string) => void;
  setDropTargetPath: (path: string | null) => void;
  handleMoveItem: (sourceId: string, targetId: string | null) => void;
  openMoveDialog: (path: string) => void;
  renderChildren: () => React.ReactNode;
  setDraggedItemPath: (path: string | null) => void;
}

const FolderItemComponent: React.FC<FolderItemProps> = ({
  folderItem,
  level,
  expandedFolders,
  draggedItemPath,
  dropTargetPath,
  handleToggleFolder,
  handleDeleteItem,
  handleCreateNoteInFolder,
  handleCreateSubfolder,
  setDropTargetPath,
  handleMoveItem,
  openMoveDialog,
  renderChildren,
  setDraggedItemPath,
}) => {
  const isExpanded = expandedFolders.includes(folderItem.id);
  const isDragged = draggedItemPath === folderItem.path;
  const isDropTarget = dropTargetPath === folderItem.path;
  const indentStyle = { paddingLeft: `${level * 12 + 8}px` };

  // Drag handlers
  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (draggedItemPath !== folderItem.path) {
        setDropTargetPath(folderItem.path);
      }
    },
    [draggedItemPath, folderItem.path, setDropTargetPath]
  );

  const handleDragLeave = useCallback(() => {
    setDropTargetPath(null);
  }, [setDropTargetPath]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const sourceId = e.dataTransfer.getData('text/plain');
      if (sourceId && sourceId !== folderItem.path) {
        handleMoveItem(sourceId, folderItem.id);
      }
      setDropTargetPath(null);
    },
    [folderItem.id, folderItem.path, handleMoveItem, setDropTargetPath]
  );

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      e.dataTransfer.setData('text/plain', folderItem.path);
      // Set dragged item path for folders too
      setDraggedItemPath(folderItem.path);
    },
    [folderItem.path, setDraggedItemPath]
  );

  const handleDragEnd = useCallback(() => {
    setDropTargetPath(null);
    setDraggedItemPath(null);
  }, [setDropTargetPath, setDraggedItemPath]);

  // Handle folder toggle
  const handleFolderClick = useCallback(() => {
    handleToggleFolder(folderItem.id);
  }, [folderItem.id, handleToggleFolder]);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          draggable
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onDragEnd={handleDragEnd}
          className={cn(
            'flex items-center w-full px-2 py-2 rounded-md cursor-pointer mb-1 group',
            {
              'bg-muted': isExpanded,
              'hover:bg-muted': !isExpanded,
              'opacity-50': isDragged,
              'ring-1 ring-primary': isDropTarget,
            }
          )}
          style={indentStyle}
          onClick={handleFolderClick}
        >
          <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
            <FiChevronRight
              className={cn('transform transition-transform', {
                'rotate-90': isExpanded,
              })}
              size={14}
            />
          </div>
          <FiFolder
            className="mr-2 flex-shrink-0"
            size={14}
          />
          <span className="flex-grow truncate">{folderItem.title}</span>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem
          onClick={() => handleCreateNoteInFolder(folderItem.id)}
        >
          New Note
        </ContextMenuItem>
        <ContextMenuItem onClick={() => handleCreateSubfolder(folderItem.path)}>
          New Subfolder
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={() => handleDeleteItem(folderItem.path, true)}
          variant="destructive"
        >
          Delete Folder
        </ContextMenuItem>
      </ContextMenuContent>
      {isExpanded && renderChildren()}
    </ContextMenu>
  );
};

export const FolderItem = FolderItemComponent;
