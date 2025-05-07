import React from 'react';
import { observer } from '@legendapp/state/react';
import { AlertCircle } from 'lucide-react';

// Types
import { ProviderType } from '@shared/types/ai';
import { GeminiModelInfo } from '@/shared/ai/models/gemini';

// Components
import { ModelList } from '@/features/settings/components/ModelSettings/ModelList';
import { ModelFormDialog } from '@/features/settings/components/ModelSettings/ModelForm';
import { ModelsHeader } from '@/features/settings/components/ModelSettings/ModelList';

// Hooks
import { useModelSettings } from '@/features/settings/hooks/useModelSettings';

interface ModelSettingsProps {
  providerId: ProviderType;
  availableModels: string[] | GeminiModelInfo[];
}

/**
 * Main component for displaying and managing model settings for a provider
 */
const ModelSettingsComponent: React.FC<ModelSettingsProps> = ({
  providerId,
  availableModels,
}) => {
  const {
    isDialogOpen,
    setIsDialogOpen,
    handleResetForm,
    modelFormProps,
    modelOperationsProps,
    defaultModelIds,
    customModelIds,
    updateCounter,
    noModelsAvailable,
  } = useModelSettings(providerId, availableModels);

  return (
    <div className="space-y-4">
      <ModelsHeader
        providerId={providerId}
        isDialogOpen={isDialogOpen}
        setIsDialogOpen={setIsDialogOpen}
        onAddNewModel={handleResetForm}
      />

      {noModelsAvailable ? (
        <div className="p-6 border rounded-md bg-muted/30 text-center">
          <div className="flex flex-col items-center gap-2">
            <AlertCircle className="h-6 w-6 text-muted-foreground" />
            <h3 className="text-lg font-medium">No Models Added</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              You haven't added any models for this provider yet. Click "Add
              Custom Model" above to create one.
            </p>
          </div>
        </div>
      ) : (
        <ModelList
          defaultModelIds={defaultModelIds}
          customModelIds={customModelIds}
          updateCounter={updateCounter}
          {...modelOperationsProps}
        />
      )}

      <ModelFormDialog
        isOpen={isDialogOpen}
        setIsOpen={setIsDialogOpen}
        availableModels={availableModels}
        {...modelFormProps}
      />
    </div>
  );
};

export const ModelSettings = observer(ModelSettingsComponent);
