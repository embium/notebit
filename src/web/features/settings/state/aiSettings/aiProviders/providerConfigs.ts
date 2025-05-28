/**
 * AI Provider Default Configurations
 * Default configurations for AI providers
 */
import { observable } from '@legendapp/state';
import { persistObservable } from '@legendapp/state/persist';

// Types
import {
  ProviderType,
  ProviderConfig,
  AISettingsState,
  ModelConfig,
} from '@shared/types/ai';
import { defaultProviders } from '@shared/constants';

// Create the aiSettings state observable
export const aiSettingsState$ = observable<AISettingsState>({
  selectedModelId: null,
  providers: defaultProviders,
  models: {},
});

// Setup persistence for the settings
persistObservable(aiSettingsState$, {
  local: 'ai-settings',
});

// Provider getter functions
export function getProviderConfig(providerId: ProviderType): ProviderConfig {
  return aiSettingsState$.providers[providerId].get();
}

export function updateProviderConfig(
  providerId: ProviderType,
  config: Partial<ProviderConfig>
): void {
  aiSettingsState$.providers[providerId].set((prev: ProviderConfig) => ({
    ...prev,
    ...config,
  }));
  const providerConfig = aiSettingsState$.providers[providerId].get();
  const selectedModelId = aiSettingsState$.selectedModelId.get();
  if (selectedModelId) {
    const selectedModel = aiSettingsState$.models[selectedModelId].get();
    if (!providerConfig.enabled) {
      console.log('Provider disabled, unselecting model');
      if (selectedModel?.provider === providerId) {
        console.log('Unselecting model');
        aiSettingsState$.selectedModelId.set(null);
      }
    }
  }
  const models = aiSettingsState$.models.get();
  if (models && typeof models === 'object') {
    (Object.values(models) as ModelConfig[]).forEach((model: ModelConfig) => {
      if (model.provider === providerId) {
        model.enabled = false;
      }
    });
  }
}

export function getEnabledProviders(): ProviderConfig[] {
  const providers = aiSettingsState$.providers.get();
  return Object.values(providers).filter(
    (provider) => (provider as ProviderConfig).enabled
  ) as ProviderConfig[];
}

// Helper function to get the embedding provider type from a provider type
export function getEmbeddingProviderType(
  providerType: ProviderType
): ProviderType {
  return providerType;
}
