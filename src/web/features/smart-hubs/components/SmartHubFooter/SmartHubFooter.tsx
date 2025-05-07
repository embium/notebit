import React from 'react';
import { BsClipboard2Data } from 'react-icons/bs';

// UI Components
import { Button } from '@/components/ui/button';
import { observer } from '@legendapp/state/react';

interface SmartHubFooterProps {
  isComposing: boolean;
  onCompose: () => void;
  onSaveAsDraft?: () => void;
}

const SmartHubFooterComponent: React.FC<SmartHubFooterProps> = ({
  isComposing,
  onCompose,
  onSaveAsDraft,
}) => {
  return (
    <div className="p-3 border-t border-border flex justify-between items-center bg-muted/30">
      <Button
        variant="ghost"
        size="sm"
      >
        <BsClipboard2Data className="h-4 w-4" />
      </Button>
      <div className="flex gap-2">
        {/*
        {onSaveAsDraft && (
          <Button
            variant="outline"
            size="sm"
            onClick={onSaveAsDraft}
          >
            Save as draft
          </Button>
        )}
        */}
        <Button
          variant={isComposing ? 'destructive' : 'default'}
          size="sm"
          onClick={onCompose}
          // disabled={isComposing ? false : smartHub.status === 'draft'}
        >
          <span className="mr-2">{isComposing ? 'Abort' : 'Compose'}</span>
        </Button>
      </div>
    </div>
  );
};

export const SmartHubFooter = observer(SmartHubFooterComponent);
