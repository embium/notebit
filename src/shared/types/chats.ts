/**
 * Types related to chat functionality
 */

import { GeminiModel } from '@src/web/shared/ai/models/gemini';
import { LanguageModelUsage } from 'ai';

export interface ModelSettings {
  aiProvider: ModelProvider;

  // openai
  openaiKey: string;
  apiHost: string;
  model: string;
  openaiCustomModel?: string;
  openaiCustomModelOptions: string[];
  openaiUseProxy: boolean;

  dalleStyle: 'vivid' | 'natural';
  imageGenerateNum: number;

  // azure
  azureEndpoint: string;
  azureDeploymentName: string;
  azureDeploymentNameOptions: string[];
  azureDalleDeploymentName: string;
  azureApikey: string;
  azureApiVersion: string;

  // chatglm
  chatglmApiKey: string;
  chatglmModel: string;

  // chatbox-ai
  licenseKey?: string;
  licenseInstances?: {
    [key: string]: string;
  };

  // claude
  claudeApiKey: string;
  claudeApiHost: string;
  claudeModel: string;

  // google gemini
  geminiAPIKey: string;
  geminiAPIHost: string;
  geminiModel: GeminiModel;

  // ollama
  ollamaHost: string;
  ollamaModel: string;

  // groq
  groqAPIKey: string;
  groqModel: string;

  // deepseek
  deepseekAPIKey: string;
  deepseekModel: string;

  // LMStudio
  lmStudioHost: string;
  lmStudioModel: string;

  // perplexity
  perplexityApiKey: string;
  perplexityModel: string;

  // xai
  xAIKey: string;
  xAIModel: string;

  // custom provider
  selectedCustomProviderId?: string;
  customProviders: CustomProvider[];

  temperature: number; // 0-2
  topP: number; // 0-1
  openaiMaxContextMessageCount: number;
  maxContextMessageCount?: number;
}

export interface CustomProvider {
  id: string;
  name: string;
  api: 'openai';
  host: string;
  path: string;
  key: string;
  model: string;
  modelOptions?: string[];
  useProxy?: boolean;
}

export interface Settings extends ModelSettings {
  showWordCount?: boolean;
  showTokenCount?: boolean;
  showTokenUsed?: boolean;
  showModelName?: boolean;
  showMessageTimestamp?: boolean;
  showFirstTokenLatency?: boolean;

  languageInited?: boolean;
  fontSize: number;
  spellCheck: boolean;

  defaultPrompt?: string;

  proxy?: string;

  allowReportingAndTracking: boolean;

  userAvatarKey?: string;
  defaultAssistantAvatarKey?: string;

  enableMarkdownRendering: boolean;
  enableMermaidRendering: boolean;
  enableLaTeXRendering: boolean;
  injectDefaultMetadata: boolean;
  autoPreviewArtifacts: boolean;
  autoCollapseCodeBlock: boolean;
  pasteLongTextAsAFile: boolean;

  autoGenerateTitle: boolean;

  autoLaunch: boolean;
  autoUpdate: boolean;
  betaUpdate: boolean;
}

export interface Config {
  uuid: string;
}

export enum ModelProvider {
  Gemini = 'gemini',
  Ollama = 'ollama',
  OpenAI = 'openai',
  Azure = 'azure',
  Claude = 'claude',
  Groq = 'groq',
  DeepSeek = 'deepseek',
  SiliconCloud = 'siliconcloud',
  LMStudio = 'lmstudio',
}

export type ModelMeta = {
  [key: string]: {
    contextWindow: number;
    maxOutput?: number;
    functionCalling?: boolean;
    vision?: boolean;
    reasoning?: boolean;
  };
};

export interface MessagePicture {
  url?: string;
  storageKey?: string;
  loading?: boolean;
}

export interface MessageWebBrowsing {
  query: string[];
  links: {
    title: string;
    url: string;
  }[];
}

export type MessageTextPart = { type: 'text'; text: string };

export type MessageImagePart = { type: 'image'; storageKey: string };

export type MessageToolCallPart = {
  type: 'tool-call';
  toolCallId: string;
  toolName: string;
  args: unknown;
};

export type MessageToolCalls = { [key: string]: MessageToolCall };

export type MessageToolCall = {
  id: string;
  function: {
    name: string;
    arguments: string;
  };
};

export const MessageRoleEnum = {
  System: 'system',
  User: 'user',
  Assistant: 'assistant',
  Tool: 'tool',
} as const;

export type MessageRole =
  (typeof MessageRoleEnum)[keyof typeof MessageRoleEnum];

export interface Message {
  id: string; // 当role为tool时，id为toolCallId
  name?: string;
  role: MessageRole;
  cancel?: () => void;
  generating?: boolean;
  model?: string;

  style?: string; // image style
  reasoningContent?: string;
  toolCalls?: MessageToolCalls;
  contentParts: MessageContentParts;
  usedSmartHubs?: string[];

  errorCode?: number;
  error?: string;
  errorExtra?: {
    [key: string]: any;
  };
  status?: (
    | {
        type: 'sending_file';
        mode?: 'local' | 'advanced';
      }
    | {
        type: 'loading_webpage';
        mode?: 'local' | 'advanced';
      }
    | {
        type: 'web_browsing';
      }
  )[];

  wordCount?: number;
  tokenCount?: number;
  tokensUsed?: number;
  timestamp?: number;
  firstTokenLatency?: number;
}

export type MessageContentParts = (
  | MessageTextPart
  | MessageImagePart
  | MessageToolCallPart
)[];

export type StreamTextResult = {
  contentParts: MessageContentParts;
  reasoningContent?: string;
  usage?: LanguageModelUsage;
};

export type SimilarityThresholdLevel = 'low' | 'medium' | 'high' | 'highest';

// Define the mapping between levels and numeric values
export const SIMILARITY_THRESHOLD_VALUES: Record<
  SimilarityThresholdLevel,
  number
> = {
  low: 0.1,
  medium: 0.25,
  high: 0.5,
  highest: 0.75,
};
