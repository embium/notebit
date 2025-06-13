import { embed } from 'ai';
import { openai } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { aiSettingsState$ } from '@/features/settings/state/aiSettings/aiProviders/providerConfigs';
import { currentEmbeddingModelDetails } from '@/features/settings/state/aiSettings/aiMemorySettings';
import { toast } from 'sonner';
import ollama from './models/ollama';
import LMStudio from './models/lmstudio';
import { EmbeddingModel } from 'ai';
import TogetherAI from './models/togetherai';

// Map of provider-specific configurations
interface EmbeddingModelConfig {
  provider: string;
  modelId: string;
  dimensions: number;
}

/**
 * Initialize an embedding model based on provider type
 *
 * @param modelId The embedding model ID
 * @param providerType The provider type (openai, google, etc.)
 * @param config Additional provider configuration
 * @returns Initialized embedding model or null if provider is not supported
 */
function initializeEmbeddingModel(
  modelId: string,
  providerType: string,
  config: any
): EmbeddingModel<string> | null {
  try {
    switch (providerType.toLowerCase()) {
      case 'openai':
        // For OpenAI, we use their embedding models directly
        return openai.embedding(modelId);
      case 'google gemini':
        // For Google, we need to create a client first
        const googleClient = createGoogleGenerativeAI({
          apiKey: config.apiKey || '',
        });
        return googleClient.embedding(modelId);
      default:
        console.error(
          `Provider ${providerType} embeddings not supported through AI SDK`
        );
        return null;
    }
  } catch (error) {
    console.error(
      `Error initializing embedding model for ${providerType}:`,
      error
    );
    return null;
  }
}

function getModelClass(providerType: string) {
  switch (providerType.toLowerCase()) {
    case 'ollama':
      return ollama;
    case 'lmstudio':
      return LMStudio;
    case 'togetherai':
      return TogetherAI;
    default:
      return null;
  }
}

/**
 * Generate embeddings for the given text using the configured AI provider
 *
 * @param text Text to generate embeddings for
 * @returns Promise with the embedding vector or null if generation fails
 */
export async function generateEmbedding(
  text: string
): Promise<number[] | null> {
  try {
    // Get current embedding settings
    const embeddingModelId =
      aiSettingsState$.aiMemorySettings.embeddingModel.get();
    const currentModel = currentEmbeddingModelDetails.get();

    if (!embeddingModelId || !currentModel) {
      console.error('No embedding model configured');
      return null;
    }

    // Get provider config
    const providerName = currentModel.provider;
    const providerType = currentModel.providerType;
    const providerConfig = aiSettingsState$.providers[providerName]?.get();

    if (!providerConfig) {
      console.error(`Provider config not found for ${providerName}`);
      return null;
    }

    console.log(
      `Generating embedding with model ${embeddingModelId} from provider ${currentModel.provider}`
    );

    // Handle different provider types with appropriate methods
    const providerTypeLower = providerType.toLowerCase();

    if (
      providerTypeLower === 'openai' ||
      providerTypeLower === 'google gemini'
    ) {
      // Use AI SDK for providers that support it
      const model = initializeEmbeddingModel(
        embeddingModelId,
        providerType,
        providerConfig
      );

      if (!model) {
        throw new Error(
          `Failed to initialize embedding model ${embeddingModelId} for provider ${providerType}`
        );
      }

      const result = await embed({
        model,
        value: text,
      });

      return result.embedding;
    } else if (
      providerTypeLower === 'ollama' ||
      providerTypeLower === 'togetherai'
    ) {
      // Use direct embedding API
      const model = getModelClass(providerType);
      if (!model) {
        throw new Error(
          `Failed to initialize embedding model ${embeddingModelId} for provider ${providerType}`
        );
      }

      if (!providerConfig.apiHost.endsWith('/v1')) {
        providerConfig.apiHost += '/v1';
      }

      const result = await model.embedding({
        modelId: embeddingModelId,
        endpoint: providerConfig.apiHost,
        apiKey: providerConfig.apiKey,
        value: text,
      });

      return result;
    }
    // } else {
    //   toast.error(
    //     `Embedding generation for ${providerType} is not currently supported. Please use OpenAI, Google Gemini, Ollama, or LM Studio.`
    //   );
    //   return null;
    // }
  } catch (error) {
    console.error('Error generating embedding:', error);
    toast.error(
      'Failed to generate embedding. Please check your AI provider settings.'
    );
    return null;
  }

  // Add explicit return at the end of the function
  return null;
}

/**
 * Batch generate embeddings for multiple texts
 *
 * @param texts Array of texts to generate embeddings for
 * @returns Promise with array of embedding vectors (null for failed generations)
 */
export async function generateEmbeddingBatch(
  texts: string[]
): Promise<(number[] | null)[]> {
  if (!texts.length) return [];

  try {
    // Get current embedding settings
    const embeddingModelId =
      aiSettingsState$.aiMemorySettings.embeddingModel.get();
    const currentModel = currentEmbeddingModelDetails.get();

    if (!embeddingModelId || !currentModel) {
      console.error('No embedding model configured');
      return texts.map(() => null);
    }

    // Get provider config
    const providerName = currentModel.provider;
    const providerType = currentModel.providerType;
    const providerConfig = aiSettingsState$.providers[providerName]?.get();

    if (!providerConfig) {
      console.error(`Provider config not found for ${providerName}`);
      return texts.map(() => null);
    }

    // Filter out empty texts
    const validTexts = texts.filter((text) => text.length > 0);
    const validIndexes = texts
      .map((text, i) => (text.length > 0 ? i : -1))
      .filter((i) => i !== -1);

    if (validTexts.length === 0) {
      return texts.map(() => null);
    }

    console.log(
      `Batch generating ${validTexts.length} embeddings with model ${embeddingModelId}`
    );

    // Process each text individually
    const results: (number[] | null)[] = texts.map(() => null);
    const providerTypeLower = providerType.toLowerCase();

    // Process in batches to avoid too many concurrent requests
    const batchSize = 5;

    if (
      providerTypeLower === 'openai' ||
      providerTypeLower === 'google gemini'
    ) {
      // For AI SDK compatible providers
      const model = initializeEmbeddingModel(
        embeddingModelId,
        providerType,
        providerConfig
      );

      if (!model) {
        throw new Error(
          `Failed to initialize embedding model ${embeddingModelId} for provider ${providerType}`
        );
      }

      for (let i = 0; i < validIndexes.length; i += batchSize) {
        const batchIndexes = validIndexes.slice(i, i + batchSize);
        const batchTexts = batchIndexes.map((idx) => texts[idx]);

        // Process batch concurrently
        const batchResults = await Promise.all(
          batchTexts.map((text) =>
            embed({
              model,
              value: text,
            })
              .then((result) => result.embedding)
              .catch((error) => {
                console.error('Error generating embedding:', error);
                return null;
              })
          )
        );

        // Map results back to original indices
        batchIndexes.forEach((originalIndex, resultIndex) => {
          results[originalIndex] = batchResults[resultIndex];
        });
      }
    } else if (
      providerTypeLower === 'ollama' ||
      providerTypeLower === 'lmstudio' ||
      providerTypeLower === 'togetherai'
    ) {
      // For Ollama provider
      for (let i = 0; i < validIndexes.length; i += batchSize) {
        const batchIndexes = validIndexes.slice(i, i + batchSize);
        const batchTexts = batchIndexes.map((idx) => texts[idx]);

        // Process batch concurrently
        const batchPromises = batchTexts.map((text) => {
          return ollama
            .embedding({
              modelId: embeddingModelId,
              endpoint: providerConfig.ollamaHost || 'http://127.0.0.1:11434',
              value: text,
              apiKey: providerConfig.apiKey,
            })
            .catch((error) => {
              console.error('Error generating Ollama embedding:', error);
              return null;
            });
        });

        const batchResults = await Promise.all(batchPromises);

        // Map results back to original indices
        batchIndexes.forEach((originalIndex, resultIndex) => {
          results[originalIndex] = batchResults[resultIndex];
        });
      }
    } else {
      toast.error(
        `Batch embedding generation for ${providerType} is not currently supported.`
      );
      return texts.map(() => null);
    }

    return results;
  } catch (error) {
    console.error('Error batch generating embeddings:', error);
    toast.error(
      'Failed to generate embeddings. Please check your AI provider settings.'
    );
    return texts.map(() => null);
  }
}
