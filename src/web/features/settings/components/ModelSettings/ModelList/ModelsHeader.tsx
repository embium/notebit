import React from 'react';
import { observer } from '@legendapp/state/react';
import { PlusCircle } from 'lucide-react';

// UI Components
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';

// Types
import { ProviderType } from '@shared/types/ai';

interface ModelsHeaderProps {
  providerId: ProviderType;
  isDialogOpen: boolean;
  setIsDialogOpen: (open: boolean) => void;
  onAddNewModel: () => void;
}

/**
 * Header component for the model settings, including the title and Add Model button
 */
const ModelsHeaderComponent: React.FC<ModelsHeaderProps> = ({
  providerId,
  isDialogOpen,
  setIsDialogOpen,
  onAddNewModel,
}) => {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h3 className="text-xl font-semibold">Available Models</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Configure and customize models for {providerId}
        </p>
      </div>

      <Dialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      >
        <DialogTrigger asChild>
          <Button
            size="sm"
            className="flex items-center"
            onClick={onAddNewModel}
          >
            <PlusCircle className="h-4 w-4 mr-1" />
            Add Custom Model
          </Button>
        </DialogTrigger>
      </Dialog>
    </div>
  );
};

export const ModelsHeader = observer(ModelsHeaderComponent);
