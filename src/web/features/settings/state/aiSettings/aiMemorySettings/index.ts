/**
 * AI Memory Settings
 *
 * Manages settings for vector embeddings and semantic search functionality
 */
import { observable, computed } from '@legendapp/state';
import { persistObservable } from '@legendapp/state/persist';

// State
import { aiSettingsState$ } from '@/features/settings/state/aiSettings/aiProviders/providerConfigs';
import {
  getEnabledProviders,
  getEmbeddingProviderType,
  getProviderConfig,
} from '@/features/settings/state/aiSettings/aiProviders/providerConfigs';
import { fetchAvailableModels } from '@/features/settings/state/aiSettings/aiModels/modelFactory';

// Types
import {
  EmbeddingModel,
  AiMemorySettings,
  ProviderType,
  KnowledgeGraphModel,
} from '@shared/types/ai';

// Constants
import { PROVIDER_EMBEDDING_MODELS } from '@shared/constants';

// Create observable state
export const aiMemorySettings$ = observable<AiMemorySettings>({
  embeddingModel: null,
  knowledgeGraphModel: null,
  neo4jUri: null,
  neo4jUsername: null,
  neo4jPassword: null,
});

// Persist memory settings to localStorage
persistObservable(aiMemorySettings$, {
  local: {
    name: 'ai-memory-settings',
  },
});

// Update aiSettings$ to include memory settings
aiSettingsState$.aiMemorySettings.set(aiMemorySettings$);

// Get all available embedding models from enabled providers
export const availableEmbeddingModels = computed(() => {
  // Get all enabled providers
  const enabledProviders = getEnabledProviders();
  console.log('enabledProviders', enabledProviders);

  // Get embedding provider types from enabled providers
  const enabledEmbeddingProviders = enabledProviders.map(
    (provider) => provider.id
  );
  console.log('enabledEmbeddingProviders', enabledEmbeddingProviders);
  // Get unique provider types
  const uniqueEmbeddingProviders = [...new Set(enabledEmbeddingProviders)];
  // Get all models for enabled providers
  const models: EmbeddingModel[] = [];
  uniqueEmbeddingProviders.forEach((providerType) => {
    if (!providerType) return;
    const providerModels =
      PROVIDER_EMBEDDING_MODELS[providerType as ProviderType] || [];
    models.push(...providerModels);
  });

  return models;
});

export const availableKnowledgeGraphModels = computed(() => {
  // Return empty array as we now fetch models directly in the hook
  return [];
});

// Get only installed embedding models
export const installedEmbeddingModels = observable<EmbeddingModel[]>([]);

// Group knowledge graph models by provider for display
export const knowledgeGraphModelsByProvider = computed(() => {
  // Return empty object since we now group models in the hook
  return {};
});

/**
 * Update installed embedding models
 */
export async function updateInstalledEmbeddingModels(): Promise<void> {
  try {
    const enabledProviders = getEnabledProviders();
    for (const provider of enabledProviders) {
      const providerType = provider.id as ProviderType;
      const providerModels = PROVIDER_EMBEDDING_MODELS[providerType] || [];
      if (providerType === 'Ollama' || providerType === 'LMStudio') {
        // Local providers: check installed models
        const providerConfig = getProviderConfig(providerType);
        const installedIds =
          (await fetchAvailableModels(providerType, providerConfig)) || [];
        providerModels.forEach((model) => {
          // Normalize model id for comparison (strip version tags for Ollama)
          const normalizedModelId = model.id.split(':')[0];
          model.isInstalled = installedIds.some(
            (id) => id.split(':')[0] === normalizedModelId
          );
        });
      } else {
        // Cloud providers: mark all as installed
        providerModels.forEach((model) => {
          model.isInstalled = true;
        });
      }
    }

    const availableModels = availableEmbeddingModels.get() || [];

    // Filter to only include installed models
    const installed = availableModels.filter(
      (model) => model.isInstalled === true
    );

    if (installed.length > 0) {
      // Directly set the models
      installedEmbeddingModels.set(installed);
    }
  } catch (error) {
    console.error(
      'Error updating embedding models installation status:',
      error
    );
  }
}

// Group embedding models by provider for display
export const embeddingModelsByProvider = computed(() => {
  // Use the directly managed list of installed models
  const models = installedEmbeddingModels.get() || [];
  const grouped: Record<string, EmbeddingModel[]> = {};

  models.forEach((model) => {
    if (!grouped[model.provider]) {
      grouped[model.provider] = [];
    }
    grouped[model.provider].push(model);
  });

  return grouped;
});

// Get provider names that have available embedding models
export const providersWithEmbeddingModels = computed(() => {
  const installed = installedEmbeddingModels.get() || [];

  // Create map of providers that have installed models
  const providerMap: Record<string, boolean> = {};
  installed.forEach((model) => {
    providerMap[model.provider] = true;
  });

  const providers = Object.keys(providerMap);
  return providers;
});

// Get provider names that have available knowledge graph models
export const providersWithKnowledgeGraphModels = computed(() => {
  // Return enabled providers since we now fetch models directly in the hook
  const enabledProviders = getEnabledProviders();
  return enabledProviders.map((p) => p.id);
});

export const currentEmbeddingModelDetails = computed(() => {
  const models = availableEmbeddingModels.get() || [];
  const installedModels = installedEmbeddingModels.get() || [];
  const modelId = aiMemorySettings$.embeddingModel.get();
  const enabledProviders = getEnabledProviders();

  // Get array of enabled provider IDs for quick lookup
  const enabledProviderIds = enabledProviders.map((p) => p.id);

  if (!modelId) return null;

  // First check if the model is among installed models with an enabled provider
  const installedModel = installedModels.find(
    (model) =>
      model.id === modelId && enabledProviderIds.includes(model.providerType)
  );
  if (installedModel) return installedModel;

  // If not found in installed models, check available models with enabled providers
  const availableModel = models.find(
    (model) =>
      model.id === modelId && enabledProviderIds.includes(model.providerType)
  );
  if (availableModel) return availableModel;

  // If model exists but provider is disabled, return null
  return null;
});

export const currentKnowledgeGraphModelDetails = computed(() => {
  const modelId = aiMemorySettings$.knowledgeGraphModel.get();
  if (!modelId) return null;

  // Return null as we now handle this in the hook
  return null;
});

/**
 * Check if specific embedding models are installed
 */
export async function checkInstalledEmbeddingModels(): Promise<
  Record<string, boolean>
> {
  const results: Record<string, boolean> = {};
  const enabledProviders = getEnabledProviders();

  // For each provider that might have embedding models
  for (const provider of enabledProviders) {
    try {
      // Only check specific providers that need installation verification
      // For now, this is primarily Ollama (local)
      if (provider.id === 'Ollama') {
        const providerConfig = getProviderConfig(provider.id as ProviderType);
        const availableModels = await fetchAvailableModels(
          provider.id as ProviderType,
          providerConfig
        );

        // Map the models to our embedding model IDs
        // For Ollama, embedding models have the same ID as LLM models
        const localEmbeddingModels = PROVIDER_EMBEDDING_MODELS.Ollama.filter(
          (model) => model.provider === 'Ollama'
        ).map((model) => model.id);

        // Check each local embedding model
        for (const modelId of localEmbeddingModels) {
          // Normalize model IDs for comparison (strip version tags if necessary)
          if (availableModels) {
            const normalizedModelId = modelId.split(':')[0]; // Remove ":latest" if present
            const isInstalled = availableModels.some((availableModel) => {
              const normalizedAvailableModel = availableModel.split(':')[0];
              return normalizedAvailableModel === normalizedModelId;
            });

            results[modelId] = isInstalled;
          }
        }
      }
    } catch (error) {
      console.error(
        `Error checking models for provider ${provider.id}:`,
        error
      );
    }
  }

  return results;
}
/**
 * Force refresh of embedding models
 */
export async function forceRefreshEmbeddingModels(): Promise<void> {
  try {
    // Hard-code the Ollama provider check since that's usually where
    // installation issues occur
    const ollamaConfig = getProviderConfig('Ollama' as ProviderType);

    // If Ollama is configured, check its models directly
    if (ollamaConfig) {
      try {
        const availableModels = await fetchAvailableModels(
          'Ollama' as ProviderType,
          ollamaConfig,
          true // Force enabled even if provider is disabled
        );

        // Update Ollama embedding models
        const ollamaEmbeddingModels = PROVIDER_EMBEDDING_MODELS.Ollama.filter(
          (model) => model.provider === 'Ollama'
        );

        // Check each model
        for (const model of ollamaEmbeddingModels) {
          if (availableModels) {
            const normalizedModelId = model.id.split(':')[0];
            const isInstalled = availableModels.some((availableModel) => {
              const normalizedAvailableModel = availableModel.split(':')[0];
              return normalizedAvailableModel === normalizedModelId;
            });

            // Update the installation status directly in the constant model array
            model.isInstalled = isInstalled;
          }
        }
      } catch (error) {
        console.error('Error checking Ollama models directly:', error);
      }
    }

    // Make sure to directly update installedEmbeddingModels
    updateInstalledEmbeddingModels();
  } catch (error) {
    console.error('Error in forceRefreshEmbeddingModels:', error);
  }
}

/**
 * Initialize embedding model based on available models
 */
export async function initializeEmbeddingModel() {
  const currentModel = aiMemorySettings$.embeddingModel.get();
  const enabledProviders = getEnabledProviders();
  const enabledProviderIds = enabledProviders.map((p) => p.id);

  // Update installation status for all models
  await updateInstalledEmbeddingModels();

  // Get models that are installed
  const installed = installedEmbeddingModels.get() || [];

  // Filter to only include models from enabled providers
  const enabledModels = installed.filter((model) =>
    enabledProviderIds.includes(model.providerType)
  );

  // If there are no installed models with enabled providers, pick a default if possible
  if (enabledModels.length === 0) {
    // If we have any installed models, set one as a fallback
    if (installed.length > 0) {
      // Force nomic-embed-text to be enabled as a last resort
      const nomicModel = installed.find(
        (model) => model.id === 'nomic-embed-text:latest'
      );
      if (nomicModel) {
        aiMemorySettings$.embeddingModel.set(nomicModel.id);
        return;
      }

      // Otherwise use the first available installed model
      aiMemorySettings$.embeddingModel.set(installed[0].id);
    }
    return;
  }

  // If there's no current model selected, select the first installed one from enabled providers
  if (!currentModel) {
    aiMemorySettings$.embeddingModel.set(enabledModels[0].id);
    return;
  }

  // Get details about current model
  const currentDetails = installed.find((model) => model.id === currentModel);

  // Check if current model exists and its provider is enabled
  const isCurrentModelValid =
    currentDetails && enabledProviderIds.includes(currentDetails.providerType);

  // Reset to an enabled model if current selection is invalid or from a disabled provider
  if (!isCurrentModelValid) {
    aiMemorySettings$.embeddingModel.set(enabledModels[0].id);
  }
}

// Set embedding model
export function setEmbeddingModel(modelId: string) {
  aiMemorySettings$.embeddingModel.set(modelId);
}

// Set knowledge graph model - accepting a model ID and creating a proper KnowledgeGraphModel object
export function setKnowledgeGraphModel(
  modelId: string,
  providerType: ProviderType,
  modelName: string = modelId
) {
  const model: KnowledgeGraphModel = {
    id: modelId,
    name: modelName,
    provider: providerType,
    providerType: providerType,
    temperature: 0,
  };
  aiMemorySettings$.knowledgeGraphModel.set(model);
}

// Re-export from state
export * from './state';

// Re-export from actions
export * from './actions';
