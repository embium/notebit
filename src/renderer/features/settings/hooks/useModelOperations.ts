import { useCallback, useMemo, useState } from 'react';
import { useObservable, useObserve } from '@legendapp/state/react';
import { toast } from 'sonner';

// Types
import { ModelConfig, ProviderType } from '@src/types/ai';

// State
import { getAllModels } from '@/features/settings/state/aiSettings/aiModels/modelOperations';

// Utils
import { createCustomModelId, extractVersionNumber } from '../utils/modelUtils';

// State
import { aiSettingsState$ } from '@/features/settings/state/aiSettings/aiProviders/providerConfigs';

/**
 * Hook for model operations (add, update, delete, etc.)
 */
export function useModelOperations(providerId: ProviderType) {
  // Create a reactive subscription to the models
  const modelsState = useObservable(aiSettingsState$.models);

  // Force re-render when models change
  const [forceUpdate, setForceUpdate] = useState(0);

  // Monitor for changes to models state
  useObserve(modelsState, () => {
    setForceUpdate((prev) => prev + 1);
  });

  // Get all models for this provider - now reactive
  const allModelsValue = useMemo(() => {
    const models = getAllModels();
    return models.filter((model) => model);
  }, [modelsState, forceUpdate]);

  const providerModels = useMemo(
    () => allModelsValue.filter((model) => model.provider === providerId),
    [allModelsValue, providerId]
  );

  /**
   * Sort and group models by type (default/custom)
   */
  const defaultModels = useMemo(() => {
    return [...providerModels.filter((model) => !model.isCustom)].sort(
      (a, b) => {
        // Extract version numbers from model IDs
        const versionA = extractVersionNumber(a.providerId || '');
        const versionB = extractVersionNumber(b.providerId || '');

        if (versionA !== versionB) {
          // Sort by version (higher first)
          return versionB - versionA;
        }

        // Fall back to alphabetical sort if versions are the same
        return (a.providerId || '').localeCompare(b.providerId || '');
      }
    );
  }, [providerModels]);

  const customModels = useMemo(() => {
    return [...providerModels.filter((model) => model.isCustom)].sort(
      (a, b) => {
        // First sort by version (from the base model)
        const versionA = extractVersionNumber(a.providerId || '');
        const versionB = extractVersionNumber(b.providerId || '');

        if (versionA !== versionB) {
          // Sort by version (higher first)
          return versionB - versionA;
        }

        // Then by custom name
        return a.name.localeCompare(b.name);
      }
    );
  }, [providerModels]);

  /**
   * Create or update a model with direct Legend State manipulation
   */
  const handleCreateOrUpdateModel = useCallback(
    (editingModelId: string | null, modelData: Partial<ModelConfig>) => {
      try {
        if (editingModelId) {
          // Update existing model
          const updatedModel = {
            ...aiSettingsState$.models[editingModelId].get(),
            ...modelData,
          };
          aiSettingsState$.models[editingModelId].set(updatedModel);
        } else {
          // Create a new model
          if (!modelData.providerId || !modelData.name) {
            throw new Error('Model ID and name are required');
          }

          const modelId = createCustomModelId(providerId, modelData.name);

          const newModel: ModelConfig = {
            id: modelId,
            name: modelData.name,
            provider: providerId,
            providerId: modelData.providerId,
            enabled: true,
            contextMessageLimit: modelData.contextMessageLimit ?? 10,
            contextTokenLimit: 8192, // Default
            maxOutputTokens: modelData.maxOutputTokens ?? 2048,
            temperature: modelData.temperature ?? 0.7,
            topP: modelData.topP ?? 0.9,
            frequencyPenalty: modelData.frequencyPenalty ?? 0.5,
            presencePenalty: modelData.presencePenalty ?? 0.5,
            extraParams: modelData.extraParams,
            isCustom: true,
          };

          // Directly manipulate the observable state
          aiSettingsState$.models[modelId].set(newModel);
        }
      } catch (error) {
        console.error('Error creating/updating model:', error);
        toast.error(
          `Failed to ${editingModelId ? 'update' : 'create'} model: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    },
    [providerId]
  );

  /**
   * Toggle model enabled/disabled
   */
  const handleToggleModel = useCallback((modelId: string, enabled: boolean) => {
    try {
      // Directly set the enabled property in the observable state
      aiSettingsState$.models[modelId].enabled.set(enabled);
    } catch (error) {
      console.error('Error toggling model:', error);
    }
  }, []);

  /**
   * Delete a model
   */
  const handleDeleteModel = useCallback((modelId: string) => {
    try {
      // Check if this is the selected model
      const selectedModelId = aiSettingsState$.selectedModelId.get();
      if (selectedModelId === modelId) {
        // Reset the selection
        aiSettingsState$.selectedModelId.set(null);
      }

      // Use delete operator to completely remove the key from observable state
      const models = { ...aiSettingsState$.models.get() };
      delete models[modelId];
      aiSettingsState$.models.set(models);
    } catch (error) {
      console.error('Error deleting model:', error);
    }
  }, []);

  /**
   * Clone a model with direct Legend State manipulation
   */
  const handleCloneModel = useCallback(
    (model: ModelConfig) => {
      try {
        const cloneName = `${model.name} (Copy)`;
        const cloneModelId = createCustomModelId(providerId, cloneName);

        const clonedModel: ModelConfig = {
          ...model,
          id: cloneModelId,
          name: cloneName,
          isCustom: true,
        };

        // Directly set the new model in the observable state
        aiSettingsState$.models[cloneModelId].set(clonedModel);
      } catch (error) {
        console.error('Error cloning model:', error);
      }
    },
    [providerId]
  );

  return {
    // Models data
    allModelsValue,
    providerModels,
    defaultModels,
    customModels,
    noModelsAvailable: providerModels.length === 0,

    // Model operations
    handleCreateOrUpdateModel,
    handleToggleModel,
    handleDeleteModel,
    handleCloneModel,
  };
}
