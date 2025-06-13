import { useState, useEffect } from 'react';

// State
import {
  aiMemorySettings$,
  availableEmbeddingModels,
  embeddingModelsByProvider,
  providersWithEmbeddingModels,
  currentEmbeddingModelDetails,
  installedEmbeddingModels,
  updateInstalledEmbeddingModels,
  forceRefreshEmbeddingModels,
  setEmbeddingModel,
} from '@/features/settings/state/aiSettings/aiMemorySettings';
import { getEnabledProviders } from '@/features/settings/state/aiSettings/aiProviders/providerConfigs';

// Utils
import {
  getInstalledModelsForProvider,
  getNotInstalledModelsForProvider,
} from '@/features/settings/utils/embeddingModelUtils';

/**
 * Hook for managing embedding model operations
 */
export function useEmbeddingModels() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Get all model state from Legend State
  const modelsByProvider = embeddingModelsByProvider.get();
  const providers = providersWithEmbeddingModels.get();
  const embeddingModel = aiMemorySettings$.embeddingModel.get();
  const currentModel = currentEmbeddingModelDetails.get();
  const allAvailableModels = availableEmbeddingModels.get();
  const installedModels = installedEmbeddingModels.get();

  // Initialize embedding model only on first load
  useEffect(() => {
    // Define a function to safely initialize without overriding user choice
    const init = async () => {
      // Update all model states
      await forceRefreshEmbeddingModels();

      // Directly update installed models list
      updateInstalledEmbeddingModels();
    };

    init();
  }, []);

  // Get installed models by provider using the utility
  const getInstalledModelsByProvider = (provider: string) => {
    return getInstalledModelsForProvider(allAvailableModels, provider);
  };

  // Get not installed models by provider using the utility
  const getNotInstalledModelsByProvider = (provider: string) => {
    return getNotInstalledModelsForProvider(allAvailableModels, provider);
  };

  // Handle refreshing the installation status
  const handleRefreshStatus = async () => {
    setIsRefreshing(true);
    try {
      await forceRefreshEmbeddingModels();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Check if model's provider is enabled
  const isProviderEnabled = (model: { providerType: string } | null) => {
    if (!model) return false;

    const enabledProviders = getEnabledProviders();
    return enabledProviders.some(
      (p: { id: string }) => p.id === model.providerType
    );
  };

  const selectedModelProviderEnabled = isProviderEnabled(currentModel);

  return {
    modelsByProvider,
    providers,
    embeddingModel,
    currentModel,
    allAvailableModels,
    installedModels,
    isRefreshing,
    selectedModelProviderEnabled,
    getInstalledModelsByProvider,
    getNotInstalledModelsByProvider,
    handleRefreshStatus,
    isProviderEnabled,
    setEmbeddingModel,
  };
}
