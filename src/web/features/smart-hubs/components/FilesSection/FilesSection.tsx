import React, { useMemo } from 'react';
import { observer } from '@legendapp/state/react';

// Types
import { FileSource, SmartHub } from '@src/shared/types/smartHubs';

// UI Components
import { Button } from '@/components/ui/button';

// Components
import { FileItemRow } from '@/features/smart-hubs/components/FileItemRow/FileItemRow';

// State
import {
  getSmartHubFiles,
  smartHubsState$,
} from '@/features/smart-hubs/state/smartHubsState';

interface FilesSectionProps {
  smartHubId: string;
  onBrowseFiles: () => void;
  onDeleteFile: (fileId: string, fileName: string) => void;
}

const FilesSectionComponent: React.FC<FilesSectionProps> = ({
  smartHubId,
  onBrowseFiles,
  onDeleteFile,
}) => {
  // Use useSelector from Legend State for better performance
  const smartHub = smartHubsState$.smartHubs
    .get()
    .find((p) => p.id === smartHubId) as SmartHub;
  const files = smartHub.files as FileSource[];

  // Memoize sorted files
  const sortedFiles = useMemo(() => {
    return files?.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    );
  }, [files]);

  return (
    <div className="p-5 border-b border-border">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Files</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={onBrowseFiles}
        >
          Browse Files...
        </Button>
      </div>

      <div className="space-y-2">
        {sortedFiles.length > 0 ? (
          <div className="max-h-[200px] overflow-y-auto pr-1">
            {sortedFiles.map((file) => (
              <FileItemRow
                key={file.id}
                file={file}
                onDeleteFile={onDeleteFile}
              />
            ))}
          </div>
        ) : (
          <div className="text-center p-4 text-muted-foreground">
            <div className="text-sm">No files added</div>
            <div className="text-xs mt-1">
              Add any text file, PDF, or document file.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const FilesSection = observer(FilesSectionComponent);
