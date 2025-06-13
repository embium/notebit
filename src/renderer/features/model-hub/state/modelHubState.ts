import { observable } from '@legendapp/state';
import { ModelInfo } from '@src/types/ai';
import { trpcProxyClient } from '@shared/config/index';
import { aiSettingsState$ } from '@/features/settings/state/aiSettings/aiSettingsState';

/**
 * Model Hub State Interface
 */
export interface ModelHubState {
  installedModels: ModelInfo[];
  availableModels: ModelInfo[];
  isLoading: boolean;
  isSearching: boolean;
  searchQuery: string;
  searchCategory?: 'embedding' | 'vision' | 'tools';
  sortBy: 'popular' | 'newest';
  pullingModels: Record<string, boolean>;
  modelProgress: Record<string, { progress: number; status: string }>;
  deletingModels: Record<string, boolean>;
}

/**
 * Initial state for the Model Hub
 */
const initialState: ModelHubState = {
  installedModels: [],
  availableModels: [],
  isLoading: false,
  isSearching: false,
  searchQuery: '',
  sortBy: 'popular',
  pullingModels: {},
  modelProgress: {},
  deletingModels: {},
};

/**
 * Observable state for Model Hub
 */
export const modelHubState$ = observable<ModelHubState>(initialState);

// Track active download requests with AbortControllers
const abortControllers: Record<string, AbortController> = {};

/**
 * Load installed models from Ollama
 */
export async function loadInstalledModels() {
  const ollamaConfig = aiSettingsState$.providers.Ollama.get();

  if (!ollamaConfig.enabled) {
    return;
  }

  try {
    modelHubState$.isLoading.set(true);

    const models = await trpcProxyClient.ollama.getInstalledModels.query({
      ollamaHost: ollamaConfig.apiHost,
    });

    modelHubState$.installedModels.set(models);
  } catch (error) {
    console.error('Error loading installed models:', error);
  } finally {
    modelHubState$.isLoading.set(false);
  }
}

/**
 * Search for available models from Ollama
 */
export async function searchModels(
  query?: string,
  category?: 'embedding' | 'vision' | 'tools',
  sort: 'popular' | 'newest' = 'popular'
) {
  try {
    modelHubState$.isSearching.set(true);
    modelHubState$.searchQuery.set(query || '');
    if (category) modelHubState$.searchCategory.set(category);
    modelHubState$.sortBy.set(sort);

    const models = await trpcProxyClient.ollama.searchModels.query({
      query,
      category,
      sort,
    });

    // Mark models that are already installed
    const installedModelIds = modelHubState$.installedModels
      .get()
      .map((m) => m.id);
    const mergedModels = models.map((model) => ({
      ...model,
      installed: installedModelIds.includes(model.id),
    }));

    modelHubState$.availableModels.set(mergedModels);
  } catch (error) {
    console.error('Error searching models:', error);
  } finally {
    modelHubState$.isSearching.set(false);
  }
}

/**
 * Pull a model from Ollama with optional size specification
 */
export async function pullModel(modelName: string, size?: string) {
  const ollamaConfig = aiSettingsState$.providers.Ollama.get();

  if (!ollamaConfig.enabled) {
    return { status: 'error', message: 'Ollama provider is not enabled' };
  }

  try {
    // Set pulling state
    modelHubState$.pullingModels[modelName].set(true);

    // Initialize progress
    modelHubState$.modelProgress[modelName].set({
      progress: 0,
      status: 'Preparing download...',
    });

    // Format the model name with size if provided
    const modelNameWithSize = size ? `${modelName}:${size}` : modelName;

    // Start the pull with progress tracking
    const result = await trpcProxyClient.ollama.pullModel.mutate({
      ollamaHost: ollamaConfig.apiHost,
      modelName: modelNameWithSize,
    });

    if (result.status === 'success') {
      // Set progress to complete
      modelHubState$.modelProgress[modelName].set({
        progress: 100,
        status: 'Completed',
      });

      // Refresh installed models
      await loadInstalledModels();

      // Update available models to reflect installation status
      const availableModels = modelHubState$.availableModels.get();
      const updatedModels = availableModels.map((model) => {
        if (model.id === modelName) {
          return { ...model, installed: true };
        }
        return model;
      });

      modelHubState$.availableModels.set(updatedModels);
    }

    return result;
  } catch (error) {
    console.error(`Error pulling model ${modelName}:`, error);
    // Update progress to indicate error
    modelHubState$.modelProgress[modelName].set({
      progress: 0,
      status: 'Error',
    });
    return { status: 'error', message: 'Failed to pull model' };
  } finally {
    // Clear pulling state after a short delay to allow seeing the final progress
    setTimeout(() => {
      modelHubState$.pullingModels[modelName].set(false);
    }, 1000);
  }
}

/**
 * Cancel a model download in progress
 */
export async function cancelDownload(modelName: string) {
  try {
    const ollamaConfig = aiSettingsState$.providers.Ollama.get();

    if (!ollamaConfig.enabled) {
      return { status: 'error', message: 'Ollama provider is not enabled' };
    }

    console.log(`Cancelling download for model ${modelName}`);

    // Call the cancelPullModel endpoint
    const result = await trpcProxyClient.ollama.cancelPullModel.mutate({
      ollamaHost: ollamaConfig.apiHost,
      modelName: modelName,
    });

    // Set pulling state to false immediately to update the UI
    modelHubState$.pullingModels[modelName].set(false);

    // Update progress to indicate cancellation
    modelHubState$.modelProgress[modelName].set({
      progress: 0,
      status: 'Download cancelled',
    });

    return result;
  } catch (error) {
    console.error(`Error cancelling download for ${modelName}:`, error);

    // Even if the server-side cancellation fails, update the UI
    modelHubState$.modelProgress[modelName].set({
      progress: 0,
      status: 'Download cancelled',
    });
    modelHubState$.pullingModels[modelName].set(false);

    return { status: 'error', message: 'Failed to cancel download' };
  }
}

/**
 * Delete a model from Ollama
 */
export async function deleteModel(modelName: string) {
  const ollamaConfig = aiSettingsState$.providers.Ollama.get();

  if (!ollamaConfig.enabled) {
    return { status: 'error', message: 'Ollama provider is not enabled' };
  }

  try {
    // Set deleting state
    modelHubState$.deletingModels[modelName].set(true);

    const result = await trpcProxyClient.ollama.deleteModel.mutate({
      ollamaHost: ollamaConfig.apiHost,
      modelName,
    });

    if (result.status === 'success') {
      // Remove from installed models
      const installedModels = modelHubState$.installedModels.get();
      modelHubState$.installedModels.set(
        installedModels.filter((model) => model.id !== modelName)
      );

      // Update available models to reflect installation status
      const availableModels = modelHubState$.availableModels.get();
      const updatedModels = availableModels.map((model) => {
        if (model.id === modelName) {
          return { ...model, installed: false };
        }
        return model;
      });

      modelHubState$.availableModels.set(updatedModels);
    }

    return result;
  } catch (error) {
    console.error(`Error deleting model ${modelName}:`, error);
    return { status: 'error', message: 'Failed to delete model' };
  } finally {
    // Clear deleting state
    modelHubState$.deletingModels[modelName].set(false);
  }
}
