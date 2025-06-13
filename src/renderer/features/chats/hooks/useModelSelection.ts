import { useCallback } from 'react';

// State
import { ModelConfig } from '@src/types/ai';

interface UseModelSelectionProps {
  selectedModel: ModelConfig | null;
  enabledModels: ModelConfig[];
  onSelectModel: (modelId: string) => void;
}

/**
 * Hook for managing AI model selection
 */
export function useModelSelection({
  selectedModel,
  enabledModels,
  onSelectModel,
}: UseModelSelectionProps) {
  // Handle selecting a model
  const handleSelectModel = useCallback(
    (model: ModelConfig) => {
      onSelectModel(model.id);
    },
    [onSelectModel]
  );

  return {
    handleSelectModel,
    hasModels: enabledModels.length > 0,
    selectedModelName: selectedModel?.name || 'Select a model',
    selectedModelProvider: selectedModel?.provider || null,
    hasSelectedModel: !!selectedModel,
  };
}
