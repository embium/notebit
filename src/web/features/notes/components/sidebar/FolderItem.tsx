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
import { cn } from '@/shared/utils';

// Types
import { NoteFile } from '@shared/types/notes';

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
          <FiChevronRight
            className={cn('mr-1 transform transition-transform', {
              'rotate-90': isExpanded,
            })}
            size={12}
          />
          <FiFolder
            className="mr-2 flex-shrink-0"
            size={14}
          />
          <span className="flex-grow truncate">{folderItem.title}</span>

          <DropdownMenu>
            <DropdownMenuTrigger
              asChild
              onClick={(e) => e.stopPropagation()}
            >
              <div className="opacity-0 group-hover:opacity-100 hover:bg-accent rounded p-1">
                <FiMoreVertical size={14} />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleCreateNoteInFolder(folderItem.id);
                }}
              >
                <FiFilePlus
                  className="mr-2"
                  size={14}
                />
                Add Note
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleCreateSubfolder(folderItem.path);
                }}
              >
                <FiFolderPlus
                  className="mr-2"
                  size={14}
                />
                Add Subfolder
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteItem(folderItem.path, true);
                }}
              >
                Delete
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  openMoveDialog(folderItem.path);
                }}
              >
                Move
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
