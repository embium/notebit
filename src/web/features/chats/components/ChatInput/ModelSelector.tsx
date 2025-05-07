import React from 'react';
import { FiChevronDown } from 'react-icons/fi';

// UI Components
import { CustomDropdown } from '@/components/custom/CustomDropdown';
import {
  CustomDropdownItem,
  CustomDropdownSeparator,
} from '@/components/custom/CustomDropdownItem';
import { Button } from '@/components/ui/button';
import { ProviderIcon } from '@/components/custom/ProviderIcons';

// Types
import { ModelConfig, ProviderType } from '@shared/types/ai';
import { observer } from '@legendapp/state/react';

interface ModelSelectorProps {
  selectedModelName: string;
  enabledModels: ModelConfig[];
  onSelectModel: (model: ModelConfig) => void;
  selectedModelId: string | null;
  selectedModelProvider: ProviderType | null;
}

/**
 * Component for selecting AI models
 */
const ModelSelectorComponent: React.FC<ModelSelectorProps> = ({
  selectedModelName,
  enabledModels,
  onSelectModel,
  selectedModelId,
  selectedModelProvider,
}) => {
  // Group models by provider
  const modelsByProvider = React.useMemo(() => {
    // Initialize with empty arrays for all available providers
    const grouped: Partial<Record<ProviderType, ModelConfig[]>> = {};

    enabledModels.forEach((model) => {
      if (!grouped[model.provider]) {
        grouped[model.provider] = [];
      }
      grouped[model.provider]?.push(model);
    });

    return grouped;
  }, [enabledModels]);

  // Get list of providers that have enabled models
  const providersWithModels = React.useMemo(() => {
    return Object.keys(modelsByProvider).filter(
      (provider) => modelsByProvider[provider as ProviderType]?.length
    ) as ProviderType[];
  }, [modelsByProvider]);

  return (
    <CustomDropdown
      className="w-auto"
      trigger={
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-between"
        >
          <div className="flex items-center px-2 py-1.5">
            <ProviderIcon
              provider={selectedModelProvider!}
              className="mr-2 h-4 w-4"
            />
            <span className="text-sm font-medium">{selectedModelName}</span>
          </div>
          <FiChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      }
      contentClassName="w-[220px]"
    >
      {!enabledModels || enabledModels.length === 0 ? (
        <CustomDropdownItem disabled>No models available</CustomDropdownItem>
      ) : (
        providersWithModels.map((provider, index) => (
          <React.Fragment key={provider}>
            {/* Add provider header with icon */}
            <div className="flex items-center px-2 py-1.5">
              <ProviderIcon
                provider={provider}
                className="mr-2 h-4 w-4"
              />
              <span className="text-sm font-medium">{provider}</span>
            </div>
            <CustomDropdownSeparator />
            {/* List models for this provider */}
            {modelsByProvider[provider]?.map((model) => (
              <CustomDropdownItem
                key={model.id}
                checked={selectedModelId === model.id}
                onCheckedChange={() => onSelectModel(model)}
              >
                <div className="flex items-center justify-between pl-4">
                  {model.name}
                </div>
              </CustomDropdownItem>
            ))}

            {/* Add separator between providers (except after the last one) */}
            {index < providersWithModels.length - 1 && (
              <CustomDropdownSeparator />
            )}
          </React.Fragment>
        ))
      )}
    </CustomDropdown>
  );
};

export const ModelSelector = observer(ModelSelectorComponent);
