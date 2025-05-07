/**
 * AI Model Factory
 * Creates model instances based on provider type and configuration
 * and provides functions for fetching available models
 */

// Models
import { ModelInterface } from '@/shared/ai/core/base';
import Ollama from '@/shared/ai/models/ollama';
import Gemini from '@/shared/ai/models/gemini';
import OpenAI from '@/shared/ai/models/openai';
import Claude from '@/shared/ai/models/claude';
import Groq from '@/shared/ai/models/groq';
import LMStudio from '@/shared/ai/models/lmstudio';
import Perplexity from '@/shared/ai/models/perplexity';
import SiliconFlow from '@/shared/ai/models/siliconflow';
import XAI from '@/shared/ai/models/xai';

// State
import { getProviderConfig } from '@/features/settings/state/aiSettings/aiProviders/providerConfigs';

// Types
import {
  ProviderType,
  ProviderConfig,
  ModelConfig,
  PROVIDER_CONFIG_MAP,
} from '@shared/types/ai';

/**
 * Initialize a model class based on provider type and configuration
 * This reduces code duplication between createModelInstance and fetchAvailableModels
 */
export function initializeModelClass(
  providerId: ProviderType,
  providerConfig: ProviderConfig,
  modelId: string,
  params: Record<string, any> = {}
): ModelInterface {
  // Base parameters with defaults
  const baseParams = {
    maxTokens: params.maxTokens || 2048,
    temperature: params.temperature || 0.7,
    topP: params.topP || 0.9,
    frequencyPenalty: params.frequencyPenalty || 0.5,
    presencePenalty: params.presencePenalty || 0.5,
    contextMessageLimit: params.contextMessageLimit || 10,
    ...params.extraParameters,
  };

  // Create model instances with appropriate parameters
  switch (providerId) {
    case 'Ollama':
      return new Ollama({
        ollamaHost: providerConfig.apiHost,
        ollamaModel: modelId,
        ...baseParams,
      });
    case 'Google Gemini':
      return new Gemini({
        geminiAPIKey: providerConfig.apiKey || '',
        geminiAPIHost: providerConfig.apiHost,
        geminiModel: modelId as any, // Type assertion needed due to strict typing
        ...baseParams,
      });
    case 'OpenAI':
      return new OpenAI({
        apiKey: providerConfig.apiKey || '',
        apiHost: providerConfig.apiHost,
        model: modelId,
        dalleStyle: 'vivid',
        injectDefaultMetadata: true,
        useProxy: false,
        ...baseParams,
      });
    case 'Claude':
      return new Claude({
        claudeApiKey: providerConfig.apiKey || '',
        claudeApiHost: providerConfig.apiHost,
        claudeModel: modelId,
        ...baseParams,
      });
    case 'Groq':
      return new Groq({
        groqAPIKey: providerConfig.apiKey || '',
        groqModel: modelId,
        ...baseParams,
      });
    case 'LMStudio':
      return new LMStudio({
        lmStudioHost: providerConfig.apiHost,
        lmStudioModel: modelId,
        ...baseParams,
      });
    case 'Perplexity':
      return new Perplexity({
        perplexityApiKey: providerConfig.apiKey || '',
        perplexityModel: modelId,
        ...baseParams,
      });
    case 'SiliconFlow':
      return new SiliconFlow({
        siliconCloudKey: providerConfig.apiKey || '',
        siliconCloudModel: modelId,
        ...baseParams,
      });
    case 'xAI':
      return new XAI({
        xAIKey: providerConfig.apiKey || '',
        xAIModel: modelId,
        ...baseParams,
      });
    default:
      throw new Error(`Unknown provider: ${providerId}`);
  }
}

/**
 * Create a model instance from a model configuration
 */
export function createModelInstance(
  model: ModelConfig,
  providerConfig?: ProviderConfig
): ModelInterface {
  // Use provided config or get from store
  const provider = providerConfig || getProviderConfig(model.provider);

  return initializeModelClass(
    model.provider,
    provider,
    model.providerId || model.id,
    {
      temperature: model.temperature,
      topP: model.topP,
      frequencyPenalty: model.frequencyPenalty,
      presencePenalty: model.presencePenalty,
      contextMessageLimit: model.contextMessageLimit,
      maxTokens: model.maxOutputTokens,
      extraParameters: model.extraParams,
    }
  );
}

/**
 * Fetch models from a provider's API
 */
export async function fetchModelsFromProvider(
  providerId: ProviderType,
  provider: ProviderConfig,
  defaultModelId: string
): Promise<string[] | undefined> {
  try {
    // Different providers require different methods for fetching models
    const modelInstance = initializeModelClass(
      providerId,
      provider,
      defaultModelId, // Default model just for the API call
      { temperature: 0.7 }
    );

    // Check if the model has a listModels method
    if (
      'listModels' in modelInstance &&
      typeof modelInstance.listModels === 'function'
    ) {
      const models = await modelInstance.listModels();

      // For Gemini models, process them differently
      if (providerId === 'Google Gemini') {
        return models.map((model: any) => ({
          ...model,
          name: model.name.replace('models/', ''), // Clean up the name for display
        }));
      }

      return models;
    }

    return [];
  } catch (error) {
    // Return the default model if there's an error
  }
}

/**
 * Fetch available models from a provider
 */
export async function fetchAvailableModels(
  providerId: ProviderType,
  providerConfig?: ProviderConfig,
  forceEnabled: boolean = false
): Promise<string[] | undefined> {
  // Use the provided config or get it from the store
  const provider = providerConfig || getProviderConfig(providerId);

  // Check if provider is enabled
  if (!provider.enabled && !forceEnabled) {
    console.warn(`Provider ${providerId} is disabled`);
    return [];
  }

  // Validate API key if required
  if (
    PROVIDER_CONFIG_MAP[providerId].needsApiKey &&
    (!provider.apiKey || provider.apiKey.trim() === '')
  ) {
    throw new Error(`API key is required for ${providerId}`);
  }

  // Validate API host if required
  if (
    PROVIDER_CONFIG_MAP[providerId].needsApiHost &&
    (!provider.apiHost || provider.apiHost.trim() === '')
  ) {
    throw new Error(`API host is required for ${providerId}`);
  }

  return fetchModelsFromProvider(providerId, provider, 'fetching-models');
}
