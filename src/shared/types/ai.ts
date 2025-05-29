/**
 * Types related to AI models and providers
 */

/**
 * AI Provider Types
 * Types related to AI providers configuration
 */

// Define the supported provider types
export type ProviderType =
  | 'Ollama'
  | 'Google Gemini'
  | 'OpenAI'
  | 'Claude'
  | 'Groq'
  | 'DeepSeek'
  | 'TogetherAI'
  | 'LMStudio'
  | 'Perplexity'
  | 'xAI';

// List of available providers
export const AVAILABLE_PROVIDERS: ProviderType[] = [
  'Ollama',
  'Google Gemini',
  'OpenAI',
  'Claude',
  'Groq',
  'DeepSeek',
  'TogetherAI',
  'LMStudio',
  'Perplexity',
  'xAI',
];

// Provider configuration interface
export interface ProviderConfig {
  id: ProviderType;
  name: string;
  enabled: boolean;
  apiHost: string;
  apiKey?: string;
  description: string;
}

// Define which providers need which configurations
export const PROVIDER_CONFIG_MAP: Record<
  ProviderType,
  { needsApiKey: boolean; needsApiHost: boolean }
> = {
  Ollama: { needsApiKey: false, needsApiHost: true },
  'Google Gemini': { needsApiKey: true, needsApiHost: false },
  OpenAI: { needsApiKey: true, needsApiHost: false },
  Claude: { needsApiKey: true, needsApiHost: false },
  Groq: { needsApiKey: true, needsApiHost: false },
  DeepSeek: { needsApiKey: true, needsApiHost: false },
  TogetherAI: { needsApiKey: true, needsApiHost: false },
  LMStudio: { needsApiKey: false, needsApiHost: true },
  Perplexity: { needsApiKey: true, needsApiHost: false },
  xAI: { needsApiKey: true, needsApiHost: false },
};

// AI Settings state interface
export interface AISettingsState {
  selectedModelId: string | null;
  providers: Record<ProviderType, ProviderConfig>;
  models: Record<string, ModelConfig>;
  [key: string]: any; // Allow dynamic properties
}

// Model configuration interface
export interface ModelConfig {
  id: string;
  name: string;
  provider: ProviderType;
  providerId?: string;
  isCustom: boolean;
  enabled: boolean;

  // Model parameters
  temperature?: number;
  contextMessageLimit?: number;
  contextTokenLimit?: number;
  maxOutputTokens?: number;

  // Additional parameters
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;

  // Extra parameters as object
  extraParams?: Record<string, any>;
}

// Types for embedding providers and models
export interface EmbeddingModel {
  id: string;
  name: string;
  provider: string;
  providerType: ProviderType;
  dimensions: number;
  description?: string;
  isInstalled?: boolean;
}

export interface KnowledgeGraphModel {
  id: string;
  name: string;
  provider: string;
  providerType: ProviderType;
  temperature: number;
}

export interface AdditionalModelsSectionProps {
  allAvailableModels: EmbeddingModel[];
  installedModels: EmbeddingModel[];
  getNotInstalledModelsForProvider: (provider: string) => EmbeddingModel[];
}

// Initial memory settings state
export interface AiMemorySettings {
  embeddingModel: string | null;
  knowledgeGraphModel: KnowledgeGraphModel | null;
  neo4jUri: string | null;
  neo4jUsername: string | null;
  neo4jPassword: string | null;
}

export type ProviderEmbeddingModels = Record<ProviderType, EmbeddingModel[]>;

/**
 * Model information with additional metadata
 */
export interface ModelInfo {
  id: string;
  name: string;
  description?: string;
  capability?: string;
  pullCount?: string;
  sizes?: string[];
  size?: string;
  modified?: string;
}
