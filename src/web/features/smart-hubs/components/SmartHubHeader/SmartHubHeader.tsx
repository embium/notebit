import React from 'react';
import { Pencil, Trash } from 'lucide-react';

// Types
import { SmartHub } from '@src/shared/types/smartHubs';

// UI Components
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { observer, useSelector } from '@legendapp/state/react';
import { smartHubsState$ } from '../../state/smartHubsState';

interface SmartHubHeaderProps {
  smartHubId: string;
  onEdit: (smartHub: SmartHub) => void;
  onDelete: () => void;
}

const SmartHubHeaderComponent: React.FC<SmartHubHeaderProps> = ({
  smartHubId,
  onEdit,
  onDelete,
}) => {
  const smartHub = smartHubsState$.smartHubs
    .get()
    .find((p) => p.id === smartHubId);

  if (!smartHub) {
    return null;
  }

  return (
    <div className="p-5 flex justify-between items-center border-b border-border">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">{smartHub.name}</h1>
        <Badge
          variant="outline"
          className={`px-2 py-1 ${
            smartHub.status === 'ready'
              ? 'text-green-500 border-green-500'
              : smartHub.status === 'error'
                ? 'text-rose-500 border-rose-500'
                : smartHub.status === 'draft'
                  ? 'text-blue-500 border-blue-500'
                  : 'text-amber-500 border-amber-500'
          }`}
        >
          {smartHub.status.toUpperCase()}
        </Badge>
      </div>

      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(smartHub)}
        >
          <Pencil className="h-4 w-4 mr-2" />
          Edit
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
        >
          <Trash className="h-4 w-4 mr-2" />
          Delete
        </Button>
      </div>
    </div>
  );
};

export const SmartHubHeader = observer(SmartHubHeaderComponent);
