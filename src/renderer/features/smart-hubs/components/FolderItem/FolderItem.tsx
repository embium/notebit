import React, { memo, useState } from 'react';
import { observer } from '@legendapp/state/react';
import {
  FolderOpen,
  FileText,
  ChevronDown,
  ChevronRight,
  X as XIcon,
} from 'lucide-react';

// Types
import { FolderSource, FileSource } from '@src/types/smartHubs';

// UI Components
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface FolderItemProps {
  folder: FolderSource;
  level: number;
  onDeleteFolder: (folderId: string, folderPath: string) => void;
}

/**
 * Recursive FolderItem component to display folders and their contents
 */
const FolderItemComponent: React.FC<FolderItemProps> = memo(
  ({ folder, level, onDeleteFolder }) => {
    const [isExpanded, setIsExpanded] = useState(level === 0); // Auto-expand top level

    // Get all files (flat structure now)
    const fileItems = folder.items as FileSource[];

    // Sort files by name
    const sortedFileItems = [...fileItems].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    );

    const hasFiles = sortedFileItems.length > 0;
    const indent = `${level * 1}rem`;

    return (
      <div className="folder-container">
        <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg border border-border">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              className={`h-6 w-6 p-0 flex-shrink-0 ${!hasFiles ? 'invisible' : ''}`}
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
            <FolderOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="break-all text-sm overflow-hidden mr-2">
              {folder.path}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge
              variant={folder.status === 'ready' ? 'outline' : 'secondary'}
              className={`text-xs ${
                folder.status === 'ready'
                  ? 'text-green-500 border-green-500'
                  : folder.status === 'error'
                    ? 'text-rose-500 border-rose-500'
                    : 'text-amber-500'
              }`}
            >
              {folder.status}
            </Badge>
            {hasFiles && (
              <Badge
                variant="secondary"
                className="text-xs"
              >
                {sortedFileItems.length} files
              </Badge>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              onClick={() => onDeleteFolder(folder.id, folder.path)}
              aria-label={`Delete folder ${folder.path}`}
            >
              <XIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {isExpanded && hasFiles && (
          <div className="pl-4 mt-1 space-y-1">
            {/* Render all files */}
            {sortedFileItems.map((file) => (
              <div
                key={file.id}
                className="flex items-center p-2 bg-muted/30 rounded-lg border border-border"
                style={{ marginLeft: indent }}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="break-all text-sm overflow-hidden mr-2">
                    {file.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge
                    variant="secondary"
                    className="text-xs"
                  >
                    {file.fileType}
                  </Badge>
                  <Badge
                    variant={file.status === 'ready' ? 'outline' : 'secondary'}
                    className={`text-xs ${
                      file.status === 'ready'
                        ? 'text-green-500 border-green-500'
                        : file.status === 'error'
                          ? 'text-rose-500 border-rose-500'
                          : 'text-amber-500'
                    }`}
                  >
                    {file.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
);

export const FolderItem = observer(FolderItemComponent);
