// State
import {
  aiMemorySettings$,
  installedEmbeddingModels,
  availableEmbeddingModels,
} from '@/features/settings/state/aiSettings/aiMemorySettings';
import { fetchAvailableModels } from '@/features/settings/state/aiSettings/aiModels/modelFactory';
import { getProviderConfig } from '@/features/settings/state/aiSettings/aiProviders/providerConfigs';

/**
 * Initialize with a direct update function
 */
export function updateInstalledEmbeddingModels(): void {
  const availableModels = availableEmbeddingModels.get();

  // Filter to only include installed models
  const installed = availableModels.filter(
    (model) => model.isInstalled === true
  );

  if (installed.length > 0) {
    // Directly set the models
    installedEmbeddingModels.set(installed);
  }
}

/**
 * Check which embedding models are installed on the system
 */
export async function checkInstalledEmbeddingModels(): Promise<
  Record<string, boolean>
> {
  const result: Record<string, boolean> = {};

  // Get all currently known models in state
  const availableModels = availableEmbeddingModels.get();

  // For cloud providers, all models are considered "installed"
  // For local providers like Ollama, we need to check if they're installed
  for (const model of availableModels) {
    const { providerType } = model;

    // Get provider config
    const providerConfig = getProviderConfig(providerType);

    if (!providerConfig) {
      // Skip if we can't get provider config
      result[model.id] = false;
      continue;
    }

    // For providers other than Ollama, all models are "installed" if the provider is enabled
    if (providerType !== 'Ollama') {
      result[model.id] = true;
      continue;
    }

    // For Ollama, check if the model is actually installed
    try {
      // Get all available Ollama models
      const ollamaAvailable = await fetchAvailableModels('Ollama');

      // Check if this embedding model is in the list
      const modelName = model.id.replace(':latest', ''); // Strip :latest if present

      // Type assertion for the Ollama models format
      interface OllamaModel {
        id: string;
      }

      const ollamaModels = ollamaAvailable as unknown as OllamaModel[];
      const isInstalled = ollamaModels.some(
        (m) => m.id === modelName || m.id === model.id
      );

      result[model.id] = isInstalled;
    } catch (error) {
      console.error('Error checking Ollama model installation:', error);
      result[model.id] = false;
    }
  }

  return result;
}

/**
 * Update the installation status of embedding models
 */
export async function updateEmbeddingModelsInstallationStatus(): Promise<void> {
  try {
    // Check installed models
    const installedStatus = await checkInstalledEmbeddingModels();

    // Update the isInstalled status for each model
    const availableModels = availableEmbeddingModels.get();
    const updatedModels = availableModels.map((model) => ({
      ...model,
      isInstalled: installedStatus[model.id] || false,
    }));

    // We need to use the computed setter function correctly
    // Replace the models in the computed observable by deep-copying
    // This would refresh all dependents
    for (let i = 0; i < updatedModels.length; i++) {
      const idx = availableModels.findIndex(
        (m) => m.id === updatedModels[i].id
      );
      if (idx >= 0) {
        // Update individual properties to trigger reactivity
        availableModels[idx].isInstalled = updatedModels[i].isInstalled;
      }
    }

    // Update the installed models list
    updateInstalledEmbeddingModels();
  } catch (error) {
    console.error(
      'Error updating embedding models installation status:',
      error
    );
  }
}

/**
 * Force a refresh of the embedding models
 */
export async function forceRefreshEmbeddingModels(): Promise<void> {
  try {
    await updateEmbeddingModelsInstallationStatus();
  } catch (error) {
    console.error('Error refreshing embedding models:', error);
  }
}

/**
 * Set the active embedding model
 */
export function setEmbeddingModel(modelId: string): void {
  aiMemorySettings$.embeddingModel.set(modelId);
}
