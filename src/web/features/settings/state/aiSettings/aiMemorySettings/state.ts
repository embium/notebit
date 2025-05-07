import { observable, computed } from '@legendapp/state';
import { persistObservable } from '@legendapp/state/persist';

// State
import { aiSettingsState$ } from '@/features/settings/state/aiSettings/aiProviders/providerConfigs';
import {
  getEnabledProviders,
  getEmbeddingProviderType,
} from '@/features/settings/state/aiSettings/aiProviders/providerConfigs';

// Types
import { ProviderType } from '@shared/types/ai';
import { AiMemorySettings, EmbeddingModel } from '@shared/types/ai';

// Constants
import { PROVIDER_EMBEDDING_MODELS } from '@shared/constants';

/**
 * Create observable state for memory settings
 */
export const aiMemorySettings$ = observable<AiMemorySettings>({
  embeddingModel: null,
});

/**
 * Persist memory settings to localStorage
 */
persistObservable(aiMemorySettings$, {
  local: {
    name: 'ai-memory-settings',
  },
});

/**
 * Update aiSettings$ to include memory settings
 */
aiSettingsState$.aiMemorySettings.set(aiMemorySettings$);

/**
 * Observable for installed embedding models
 */
export const installedEmbeddingModels = observable<EmbeddingModel[]>([]);

/**
 * Get all available embedding models from enabled providers
 */
export const availableEmbeddingModels = computed(() => {
  // Get all enabled providers
  const enabledProviders = getEnabledProviders();

  // Get embedding provider types from enabled providers
  const enabledEmbeddingProviders = enabledProviders.map((provider) =>
    getEmbeddingProviderType(provider.id)
  );

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

/**
 * Get embedding models grouped by provider
 */
export const embeddingModelsByProvider = computed(() => {
  const models = availableEmbeddingModels.get();
  const modelsByProvider: Record<string, EmbeddingModel[]> = {};

  models.forEach((model) => {
    if (!modelsByProvider[model.provider]) {
      modelsByProvider[model.provider] = [];
    }
    if (model.isInstalled) {
      modelsByProvider[model.provider].push(model);
    }
  });

  return modelsByProvider;
});

/**
 * Get unique providers with embedding models
 */
export const providersWithEmbeddingModels = computed(() => {
  const modelsByProvider = embeddingModelsByProvider.get();
  return Object.keys(modelsByProvider);
});

/**
 * Get details of the current embedding model
 */
export const currentEmbeddingModelDetails = computed(() => {
  const embeddingModelId = aiMemorySettings$.embeddingModel.get();
  const models = availableEmbeddingModels.get();

  if (!embeddingModelId) return null;

  return models.find((model) => model.id === embeddingModelId) || null;
});
