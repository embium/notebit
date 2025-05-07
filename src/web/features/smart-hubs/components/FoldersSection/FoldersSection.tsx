import React, { useMemo } from 'react';
import { FolderSource, SmartHub } from '@src/shared/types/smartHubs';
import { Button } from '@/components/ui/button';
import { FolderItem } from '../FolderItem/FolderItem';
import { smartHubsState$ } from '../../state/smartHubsState';

interface FoldersSectionProps {
  smartHubId: string;
  onBrowseFolders: () => void;
  onDeleteFolder: (folderId: string, folderPath: string) => void;
}

export const FoldersSection: React.FC<FoldersSectionProps> = ({
  smartHubId,
  onBrowseFolders,
  onDeleteFolder,
}) => {
  const smartHub = smartHubsState$.smartHubs
    .get()
    .find((p) => p.id === smartHubId) as SmartHub;
  const folders = smartHub.folders as FolderSource[];

  const sortedFolders = useMemo(() => {
    return folders?.sort((a, b) =>
      a.path.localeCompare(b.path, undefined, { sensitivity: 'base' })
    );
  }, [folders]);

  return (
    <div className="p-5 border-b border-border">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Folders</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={onBrowseFolders}
        >
          Browse Folders...
        </Button>
      </div>

      <div className="space-y-2">
        {folders.length > 0 ? (
          <div className="max-h-[200px] overflow-y-auto pr-1">
            {sortedFolders.map((folder) => (
              <FolderItem
                key={folder.id}
                folder={folder}
                level={0}
                onDeleteFolder={onDeleteFolder}
              />
            ))}
          </div>
        ) : (
          <div className="text-center p-4 text-muted-foreground">
            <div className="text-sm">No folders linked</div>
            <div className="text-xs mt-1">
              Link folders containing any text file, PDF, or document file
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
