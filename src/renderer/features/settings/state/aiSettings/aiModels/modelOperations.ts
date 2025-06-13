/**
 * Model Operations
 * Functions for managing models (add, update, delete, get)
 */
import { computed } from '@legendapp/state';
import { v4 as uuidv4 } from 'uuid';

// State
import {
  aiSettingsState$,
  getProviderConfig,
} from '@/features/settings/state/aiSettings/aiProviders/providerConfigs';

// Types
import { ModelConfig, ProviderType } from '@src/types/ai';

/**
 * Get all models from state
 */
export function getAllModels(): ModelConfig[] {
  const models = aiSettingsState$.models.get();
  // Filter out any undefined or null values
  return Object.values(models).filter(
    (model): model is ModelConfig => model !== undefined && model !== null
  );
}

/**
 * Get models enabled for use
 */
export function getEnabledModels(): ModelConfig[] {
  const allModels = getAllModels();
  return allModels.filter((model) => {
    const providerConfig = getProviderConfig(model.provider);
    return model.enabled && providerConfig.enabled;
  });
}

/**
 * Get a model by its ID
 */
export function getModelById(modelId: string): ModelConfig | null {
  return aiSettingsState$.models[modelId].get() || null;
}

/**
 * Get the selected model
 */
export function getSelectedModel(): ModelConfig | null {
  const selectedId = aiSettingsState$.selectedModelId.get();
  if (!selectedId) return null;
  return aiSettingsState$.models[selectedId].get() || null;
}

/**
 * Set the selected model
 */
export function setSelectedModel(modelId: string | null): void {
  aiSettingsState$.selectedModelId.set(modelId);
}

/**
 * Add a model configuration
 */
export function addModel(providerId: ProviderType, model: ModelConfig): void {
  aiSettingsState$.models[model.id].set(model);
}

/**
 * Legacy method for adding models
 */
export function addModelLegacy(model: ModelConfig): void {
  // Ensure ID exists
  const modelId = model.id || uuidv4();
  aiSettingsState$.models[modelId].set({ ...model, id: modelId });
}

/**
 * Update a model's configuration
 */
export function updateModel(
  modelId: string,
  updates: Partial<ModelConfig>
): void {
  const existingModel = aiSettingsState$.models[modelId].get();
  if (!existingModel) {
    console.error(`Cannot update model ${modelId} as it doesn't exist`);
    return;
  }

  aiSettingsState$.models[modelId].set((prev: ModelConfig) => ({
    ...prev,
    ...updates,
  }));
}

/**
 * Delete a model
 */
export function deleteModel(modelId: string): void {
  // Check if this is the selected model
  const selectedModelId = aiSettingsState$.selectedModelId.get();
  if (selectedModelId === modelId) {
    // Reset the selection
    aiSettingsState$.selectedModelId.set(null);
  }

  try {
    // Use delete operator to completely remove the key instead of setting to undefined
    const models = { ...aiSettingsState$.models.get() };
    delete models[modelId];
    aiSettingsState$.models.set(models);
  } catch (error) {
    console.error(`Error deleting model ${modelId}:`, error);
  }
}

/**
 * Create a custom model ID
 */
export function createCustomModelId(
  providerId: ProviderType,
  baseName: string
): string {
  return `${providerId.toLowerCase()}-custom-${baseName}-${Date.now().toString(36)}`;
}

/**
 * Computed list of enabled models
 */
export const enabledModels = computed(() => {
  const allModels = getAllModels();
  return allModels.filter((model) => model.enabled);
});

/**
 * Computed selected model
 */
export const selectedModel = computed(() => {
  const selectedId = aiSettingsState$.selectedModelId.get();
  if (!selectedId) return null;
  return aiSettingsState$.models[selectedId].get() || null;
});
