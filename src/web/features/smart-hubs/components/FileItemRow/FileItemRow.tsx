import React, { memo } from 'react';
import { observer } from '@legendapp/state/react';
import { FileText, X as XIcon } from 'lucide-react';

// Types
import { FileSource } from '@src/shared/types/smartHubs';

// UI Components
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface FileItemRowProps {
  file: FileSource;
  onDeleteFile: (fileId: string, fileName: string) => void;
}

// memoizing the component used to be here
const FileItemRowComponent = ({ file, onDeleteFile }: FileItemRowProps) => {
  return (
    <div
      key={file.id}
      className="flex items-center justify-between p-3 bg-muted/40 rounded-lg border border-border mb-2"
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
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-foreground"
          onClick={() => onDeleteFile(file.id, file.name)}
          aria-label={`Delete file ${file.name}`}
        >
          <XIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
export const FileItemRow = observer(FileItemRowComponent);
