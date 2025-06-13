// State
import { EmbeddingModel, KnowledgeGraphModel } from '@src/types/ai';

/**
 * Groups embedding models by their provider
 */
export function groupModelsByProvider(
  models: EmbeddingModel[]
): Record<string, EmbeddingModel[]> {
  return models.reduce(
    (acc, model) => {
      if (!acc[model.provider]) {
        acc[model.provider] = [];
      }
      acc[model.provider].push(model);
      return acc;
    },
    {} as Record<string, EmbeddingModel[]>
  );
}

/**
 * Extracts unique provider names from a list of embedding models
 */
export function getUniqueProviders(models: EmbeddingModel[]): string[] {
  const providersSet = new Set<string>();
  models.forEach((model) => providersSet.add(model.provider));
  return Array.from(providersSet);
}

/**
 * Filters models to return only installed ones
 */
export function getInstalledModels(models: EmbeddingModel[]): EmbeddingModel[] {
  return models.filter((model) => model.isInstalled === true);
}

/**
 * Filters models to return only those that are not installed
 */
export function getNotInstalledModels(
  models: EmbeddingModel[]
): EmbeddingModel[] {
  return models.filter((model) => model.isInstalled === false);
}

/**
 * Gets models for a specific provider
 */
export function getModelsForProvider(
  models: EmbeddingModel[],
  provider: string
): EmbeddingModel[] {
  return models.filter((model) => model.provider === provider);
}

/**
 * Gets installed models for a specific provider
 */
export function getInstalledModelsForProvider(
  models: EmbeddingModel[],
  provider: string
): EmbeddingModel[] {
  return models.filter(
    (model) => model.provider === provider && model.isInstalled
  );
}

/**
 * Gets installed models for a specific provider
 */
export function getInstalledKnowledgeGraphModelsForProvider(
  models: KnowledgeGraphModel[],
  provider: string
): KnowledgeGraphModel[] {
  return models.filter((model) => model.provider === provider);
}

/**
 * Gets not installed models for a specific provider
 */
export function getNotInstalledModelsForProvider(
  models: EmbeddingModel[],
  provider: string
): EmbeddingModel[] {
  return models.filter(
    (model) => model.provider === provider && model.isInstalled === false
  );
}

/**
 * Finds a model by its ID
 */
export function findModelById(
  models: EmbeddingModel[],
  modelId: string | null
): EmbeddingModel | null {
  if (!modelId) return null;
  return models.find((model) => model.id === modelId) || null;
}
