import { useState, useEffect } from 'react';

// State
import {
  aiMemorySettings$,
  availableKnowledgeGraphModels,
  knowledgeGraphModelsByProvider,
  providersWithKnowledgeGraphModels,
  setKnowledgeGraphModel,
} from '@/features/settings/state/aiSettings/aiMemorySettings';
import {
  getEnabledProviders,
  getProviderConfig,
} from '@/features/settings/state/aiSettings/aiProviders/providerConfigs';
import { fetchAvailableModels } from '@/features/settings/state/aiSettings/aiModels/modelFactory';

// Types
import { KnowledgeGraphModel, ProviderType } from '@shared/types/ai';

/**
 * Hook for managing knowledge graph model operations
 */
export function useKnowledgeGraphModels() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [availableProviderModels, setAvailableProviderModels] = useState<
    Record<ProviderType, string[]>
  >({} as Record<ProviderType, string[]>);
  const [knowledgeGraphModels, setKnowledgeGraphModels] = useState<
    KnowledgeGraphModel[]
  >([]);

  // Get state from Legend State
  const knowledgeGraphModel = aiMemorySettings$.knowledgeGraphModel.get();

  // Current model needs to be tracked internally
  const [currentModel, setCurrentModel] = useState<KnowledgeGraphModel | null>(
    null
  );

  // Fetch models from all enabled providers
  const fetchProviderModels = async () => {
    setIsRefreshing(true);
    try {
      const enabledProviders = getEnabledProviders();

      const modelsByProvider: Record<ProviderType, string[]> = {} as Record<
        ProviderType,
        string[]
      >;

      // Fetch models from each enabled provider
      for (const provider of enabledProviders) {
        const providerType = provider.id as ProviderType;
        const providerConfig = getProviderConfig(providerType);

        try {
          const models = await fetchAvailableModels(
            providerType,
            providerConfig
          );

          if (models && models.length > 0) {
            modelsByProvider[providerType] = models;
          }
        } catch (error) {
          console.error(
            `Error fetching models for provider ${providerType}:`,
            error
          );
        }
      }

      console.log('Models by provider:', modelsByProvider);
      setAvailableProviderModels(modelsByProvider);

      // Create knowledge graph models from fetched models
      const models: KnowledgeGraphModel[] = [];

      // Process each provider's models
      Object.entries(modelsByProvider).forEach(([provider, providerModels]) => {
        const providerType = provider as ProviderType;

        // Filter models suitable for knowledge graph tasks
        // Each provider might have different criteria for models capable of knowledge graph extraction
        const filteredModels = filterModelsForKnowledgeGraph(
          providerType,
          providerModels
        );
        console.log(`Filtered models for ${providerType}:`, filteredModels);

        // Create KnowledgeGraphModel objects
        filteredModels.forEach((modelId) => {
          models.push({
            id: modelId,
            name: getDisplayName(providerType, modelId),
            provider: providerType,
            providerType: providerType,
            temperature: 0,
          });
        });
      });

      console.log('Final knowledge graph models:', models);
      setKnowledgeGraphModels(models);
    } catch (error) {
      console.error('Error fetching provider models:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Filter models suitable for knowledge graph extraction based on provider
  const filterModelsForKnowledgeGraph = (
    providerType: ProviderType,
    models: string[]
  ): string[] => {
    switch (providerType) {
      /*
      case 'OpenAI':
        // Filter for GPT-4 and GPT-3.5 models that are capable of knowledge graph extraction
        return models.filter(
          (model) => model.includes('gpt-4') || model.includes('gpt-3.5-turbo')
        );

      case 'Google Gemini':
        // Filter for Gemini models
        return models.filter(
          (model) =>
            model.includes('gemini-') &&
            (model.includes('-pro') ||
              model.includes('-ultra') ||
              model.includes('-flash'))
        );

      case 'Claude':
        // Filter for Claude 3 models
        return models.filter((model) => model.includes('claude-3'));

      case 'Ollama':
        // Filter for models that are suitable for knowledge graph extraction
        // but preserve all variants (with different sizes/versions)
        return models.filter((model) => {
          const normalizedModel = model.toLowerCase();
          return (
            normalizedModel.includes('llama') ||
            normalizedModel.includes('mixtral') ||
            normalizedModel.includes('mistral') ||
            normalizedModel.includes('vicuna') ||
            normalizedModel.includes('zephyr') ||
            normalizedModel.includes('qwen') ||
            normalizedModel.includes('gemma')
          );
        });

      case 'LMStudio':
        // Filter for models suitable for knowledge graph extraction
        return models.filter((model) => {
          const normalizedModel = model.toLowerCase();
          return (
            normalizedModel.includes('llama') ||
            normalizedModel.includes('mixtral') ||
            normalizedModel.includes('mistral') ||
            normalizedModel.includes('vicuna') ||
            normalizedModel.includes('falcon') ||
            normalizedModel.includes('zephyr') ||
            normalizedModel.includes('gemma')
          );
        });
      */

      default:
        // For other providers, just return all models for now
        return models;
    }
  };

  // Get a display name for the model
  const getDisplayName = (
    providerType: ProviderType,
    modelId: string
  ): string => {
    // Clean up model IDs to create user-friendly display names
    switch (providerType) {
      case 'OpenAI':
        return modelId.replace('gpt-', 'GPT-').replace('-turbo', ' Turbo');

      case 'Google Gemini':
        return modelId
          .replace('gemini-', 'Gemini ')
          .replace('-', ' ')
          .toUpperCase();

      case 'Claude':
        return modelId
          .replace('-', ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase());

      case 'Ollama':
      case 'LMStudio':
        // Keep original model name for Ollama and LMStudio
        return modelId;

      default:
        return modelId;
    }
  };

  // Fetch models on mount
  useEffect(() => {
    fetchProviderModels();
  }, []);

  // Effect to set the current model when models are loaded or selection changes
  useEffect(() => {
    if (!knowledgeGraphModel || knowledgeGraphModels.length === 0) {
      setCurrentModel(null);
      return;
    }

    // Find the selected model in our models list
    const selectedModelId =
      typeof knowledgeGraphModel === 'string'
        ? knowledgeGraphModel
        : knowledgeGraphModel.id;

    const selectedModel = knowledgeGraphModels.find(
      (model) => model.id === selectedModelId
    );

    if (selectedModel) {
      setCurrentModel(selectedModel);
    } else {
      // If the selected model is not available, set to null
      setCurrentModel(null);
    }
  }, [knowledgeGraphModel, knowledgeGraphModels]);

  // Handle refreshing models
  const handleRefreshStatus = async () => {
    await fetchProviderModels();
  };

  // Check if model's provider is enabled
  const isProviderEnabled = (model: { providerType: string } | null) => {
    if (!model) return false;

    const enabledProviders = getEnabledProviders();
    return enabledProviders.some(
      (p: { id: string }) => p.id === model.providerType
    );
  };

  // Create modelsByProvider structure
  const modelsByProvider = knowledgeGraphModels.reduce(
    (acc, model) => {
      if (!acc[model.provider]) {
        acc[model.provider] = [];
      }
      acc[model.provider].push(model);
      return acc;
    },
    {} as Record<string, KnowledgeGraphModel[]>
  );

  const selectedModelProviderEnabled = isProviderEnabled(currentModel);

  // Check if a specific model is available
  const isModelAvailable = (
    modelId: string,
    provider: ProviderType
  ): boolean => {
    const models = availableProviderModels[provider] || [];

    if (provider === 'Ollama' || provider === 'LMStudio') {
      // For Ollama/LMStudio, compare the exact model ID including version tags
      return models.includes(modelId);
    }

    // For other providers, we can do a simple includes check
    return models.includes(modelId);
  };

  return {
    modelsByProvider,
    providers: Object.keys(modelsByProvider),
    currentModel,
    knowledgeGraphModel,
    allAvailableModels: knowledgeGraphModels,
    isRefreshing,
    handleRefreshStatus,
    setKnowledgeGraphModel,
    selectedModelProviderEnabled,
    isModelAvailable,
  };
}
