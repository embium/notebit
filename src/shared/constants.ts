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
  fileAttachments: 'File Attachments Prompt',
  smartHubs: 'Smart Hubs Prompt',
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

  TogetherAI: [
    /*
    {
      id: 'intfloat/multilingual-e5-large-instruct',
      name: 'Multilingual E5 Large Instruct',
      provider: 'TogetherAI',
      providerType: 'TogetherAI',
      dimensions: 1024,
      description: 'Cloud embedding via TogetherAI',
    },
    {
      id: 'Alibaba-NLP/gte-modernbert-base',
      name: 'Gte Modernbert Base',
      provider: 'TogetherAI',
      providerType: 'TogetherAI',
      dimensions: 768,
      description: 'Cloud embedding via TogetherAI',
    },
    {
      id: 'togethercomputer/m2-bert-80M-32k-retrieval',
      name: 'M2-BERT-Retrieval-32k',
      provider: 'TogetherAI',
      providerType: 'TogetherAI',
      dimensions: 768,
      description: 'Cloud embedding via TogetherAI',
    },
    {
      id: 'togethercomputer/m2-bert-80M-8k-retrieval',
      name: 'M2-BERT-Retrieval-8k',
      provider: 'TogetherAI',
      providerType: 'TogetherAI',
      dimensions: 768,
      description: 'Cloud embedding via TogetherAI',
    },
    {
      id: 'togethercomputer/m2-bert-80M-2k-retrieval',
      name: 'M2-BERT-Retrieval-2K',
      provider: 'TogetherAI',
      providerType: 'TogetherAI',
      dimensions: 768,
      description: 'Cloud embedding via TogetherAI',
    },
    {
      id: 'WhereIsAI/UAE-Large-V1',
      name: 'UAE-Large-V1',
      provider: 'TogetherAI',
      providerType: 'TogetherAI',
      dimensions: 768,
      description: 'Cloud embedding via TogetherAI',
    },
    {
      id: 'BAAI/bge-large-en-v1.5',
      name: 'BAAI-Bge-Large-1p5',
      provider: 'TogetherAI',
      providerType: 'TogetherAI',
      dimensions: 1024,
      description: 'Cloud embedding via TogetherAI',
    },
    {
      id: 'BAAI/bge-base-en-v1.5',
      name: 'BAAI-Bge-Base-1.5',
      provider: 'TogetherAI',
      providerType: 'TogetherAI',
      dimensions: 768,
    },
    */
  ],
  LMStudio: [
    /*
    {
      id: 'text-embedding-nomic-embed-text-v1.5',
      name: 'text-embedding-nomic-embed-text-v1.5',
      provider: 'LMStudio',
      providerType: 'LMStudio',
      dimensions: 768,
      description: 'Local embedding via LMStudio',
    },
    */
  ],
  xAI: [
    /*
    {
      id: 'embedding-beta',
      name: 'Embedding Beta',
      provider: 'xAI',
      providerType: 'xAI',
      dimensions: 6144,
      description: 'xAI embedding model',
    },
    */
  ],
  DeepSeek: [],
  Claude: [],
  Groq: [],
  Perplexity: [],
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

export const KNOWLEDGE_GRAPH_EXTRACTION_PROMPT = `You are an AI assistant specialized in extracting structured information from text and outputting it ONLY in valid JSON format. You will be given specific instructions for the structure of the JSON. Do not include any explanations, apologies, or conversational text before or after the JSON output. Adhere strictly to the requested JSON schema.

You are an expert data analyst. Your task is to carefully read the provided text and extract ONLY entities.

**Input Text:**

[CONTENT_TO_EXTRACT]

**Task Instructions:**
1. Identify all distinct entities in the text.
2. For each entity, provide:
    - \`id\`: A temporary, unique ID for this entity within this document (e.g., "e1", "e2", "e3").
    - \`name\`: The canonical name of the entity.
    - \`type\`: The entity type. Choose *only* from this list: PERSON, ORGANIZATION, LOCATION, PROJECT, PRODUCT, DATE, CONCEPT.
    - \`description\`: A concise, one-sentence summary of the entity based *only* on the provided text. If no description can be derived from the text, use an empty string \`""\`.
    - \`source_text_snippets\`: A list containing one or two exact, brief snippets (under 15 words each) from the input text that mention this entity. If no direct snippet is applicable, use an empty list \`[]\`.
3. Output your findings in a single JSON object. The JSON object must have a key "entities" which is a list of the entity objects you extracted.
4. If no entities are found, the "entities" list should be empty (\`[]\`).
5. YOU MUST output only the JSON object, DO NOT use any markdown formatting.. No other text before or after.

**ENTITY_TYPES List:**
{{YOUR_ENTITY_TYPES_LIST_STRICT}}
(Example: ["PERSON", "ORGANIZATION", "LOCATION", "PROJECT", "PRODUCT", "DATE", "TECHNOLOGY", "CONCEPT"])\`\`\``;
