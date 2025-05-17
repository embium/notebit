import {
  ProviderConfig,
  ProviderEmbeddingModels,
  ProviderType,
} from './types/ai';
import { PromptType } from './types/settings';

export enum ContextWindowSize {
  t16k = 16384,
  t32k = 32768,
  t64k = 65536,
  t128k = 131072,
}

// Mapping for dropdown display
export const promptTypeLabels: Record<PromptType, string> = {
  system: 'Default System Prompt',
  title: 'Title Generation Prompt',
  note: 'Note to Chat Prompt',
};

export const PROVIDER_EMBEDDING_MODELS: ProviderEmbeddingModels = {
  OpenAI: [
    {
      id: 'text-embedding-3-small',
      name: 'Embedding 3 Small',
      provider: 'OpenAI',
      providerType: 'OpenAI',
      dimensions: 1536,
      description:
        'Efficient and cost-effective text embeddings for semantic search',
    },
    {
      id: 'text-embedding-3-large',
      name: 'Embedding 3 Large',
      provider: 'OpenAI',
      providerType: 'OpenAI',
      dimensions: 3072,
      description:
        'High-performance text embeddings for advanced semantic operations',
    },
    {
      id: 'text-embedding-ada-002',
      name: 'Embedding Ada 002 (Legacy)',
      provider: 'OpenAI',
      providerType: 'OpenAI',
      dimensions: 1536,
      description: 'Legacy embedding model',
    },
  ],
  'Google Gemini': [
    {
      id: 'gemini-embedding-exp-03-07',
      name: 'Gemini Embedding Exp 03-07',
      provider: 'Google Gemini',
      providerType: 'Google Gemini',
      dimensions: 768,
      description: 'Google embedding model',
    },
    {
      id: 'text-embedding-004',
      name: 'Text Embedding 004',
      provider: 'Google Gemini',
      providerType: 'Google Gemini',
      dimensions: 768,
      description: 'Google embedding model',
    },
    {
      id: 'embedding-001',
      name: 'Embedding 001',
      provider: 'Google Gemini',
      providerType: 'Google Gemini',
      dimensions: 768,
      description: 'Google embedding model',
    },
  ],
  Ollama: [
    {
      id: 'nomic-embed-text:latest',
      name: 'nomic-embed-text',
      provider: 'Ollama',
      providerType: 'Ollama',
      dimensions: 768,
      description: 'Local embedding via Ollama',
    },
    {
      id: 'mxbai-embed-large:latest',
      name: 'mxbai-embed-large',
      provider: 'Ollama',
      providerType: 'Ollama',
      dimensions: 512,
      description: 'Local embedding via Ollama',
    },
    {
      id: 'bge-m3:latest',
      name: 'bge-m3',
      provider: 'Ollama',
      providerType: 'Ollama',
      dimensions: 1024,
      description: 'Local embedding via Ollama',
    },
    {
      id: 'snowflake-arctic-embed:latest',
      name: 'snowflake-arctic-embed',
      provider: 'Ollama',
      providerType: 'Ollama',
      dimensions: 1024,
      description: 'Local embedding via Ollama',
    },
    {
      id: 'snowflake-arctic-embed2:latest',
      name: 'snowflake-arctic-embed2',
      provider: 'Ollama',
      providerType: 'Ollama',
      dimensions: 256,
      description: 'Local embedding via Ollama',
    },
    {
      id: 'paraphrase-multilingual:latest',
      name: 'paraphrase-multilingual',
      provider: 'Ollama',
      providerType: 'Ollama',
      dimensions: 768,
      description: 'Local embedding via Ollama',
    },
  ],
  TogetherAI: [],
  DeepSeek: [],
  Claude: [],
  Groq: [],
  LMStudio: [],
  Perplexity: [],
  xAI: [],
};

export const defaultProviders: Record<ProviderType, ProviderConfig> = {
  Ollama: {
    id: 'Ollama',
    name: 'Ollama',
    enabled: false,
    apiHost: 'http://127.0.0.1:11434',
    description: 'Run open-source LLMs locally on your machine',
  },
  'Google Gemini': {
    id: 'Google Gemini',
    name: 'Google Gemini',
    enabled: false,
    apiHost: 'https://generativelanguage.googleapis.com/',
    apiKey: '',
    description: "Google's multimodal AI model",
  },
  OpenAI: {
    id: 'OpenAI',
    name: 'OpenAI',
    enabled: false,
    apiHost: 'https://api.openai.com',
    apiKey: '',
    description: 'OpenAI API',
  },
  Claude: {
    id: 'Claude',
    name: 'Claude',
    enabled: false,
    apiHost: 'https://api.anthropic.com/v1',
    apiKey: '',
    description: 'Claude API',
  },
  Groq: {
    id: 'Groq',
    name: 'Groq',
    enabled: false,
    apiHost: 'https://api.groq.com',
    apiKey: '',
    description: 'Groq API',
  },
  DeepSeek: {
    id: 'DeepSeek',
    name: 'DeepSeek',
    enabled: false,
    apiHost: 'https://api.deepseek.com/',
    apiKey: '',
    description: 'DeepSeek API',
  },
  TogetherAI: {
    id: 'TogetherAI',
    name: 'TogetherAI',
    enabled: false,
    apiHost: 'https://api.together.xyz/v1',
    apiKey: '',
    description: 'TogetherAI API',
  },
  LMStudio: {
    id: 'LMStudio',
    name: 'LMStudio',
    enabled: false,
    apiHost: 'http://127.0.0.1:1234',
    apiKey: '',
    description: 'LMStudio API',
  },
  Perplexity: {
    id: 'Perplexity',
    name: 'Perplexity',
    enabled: false,
    apiHost: 'https://api.perplexity.ai',
    apiKey: '',
    description: 'Perplexity API',
  },
  xAI: {
    id: 'xAI',
    name: 'xAI',
    enabled: false,
    apiHost: 'https://api.xai.com',
    apiKey: '',
    description: 'xAI API',
  },
};
