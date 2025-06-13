import { fetchWithProxy } from '@src/renderer/utils/request';
import { createOpenAI } from '@ai-sdk/openai';
import { extractReasoningMiddleware, wrapLanguageModel } from 'ai';
import AbstractAISDKModel from '../core/abstract-ai-sdk';
import { ModelHelpers } from '../core/base';
import { normalizeOpenAIApiHostAndPath } from '../llm_utils';
import { fetchRemoteModels } from './openai-compatible';

const helpers: ModelHelpers = {
  isModelSupportVision: (model: string) => {
    return openaiModelConfigs[model as OpenAIModel]?.vision !== false;
  },
  isModelSupportToolUse: (model: string) => {
    return true;
  },
};

interface Options {
  apiKey: string;
  apiHost: string;
  model: OpenAIModel | string;
  dalleStyle: 'vivid' | 'natural';
  temperature: number;
  topP?: number;
  injectDefaultMetadata: boolean;
  useProxy: boolean;
}

export default class OpenAI extends AbstractAISDKModel {
  public name = 'OpenAI';
  public static helpers = helpers;
  public options: Options;

  constructor(options: Options) {
    super();
    const { apiHost } = normalizeOpenAIApiHostAndPath(options);
    this.options = { ...options, apiHost };
  }

  public isSupportToolUse() {
    return helpers.isModelSupportToolUse(this.options.model);
  }

  private getProvider() {
    return createOpenAI({
      apiKey: this.options.apiKey,
      baseURL: this.options.apiHost,
      fetch: this.options.useProxy ? fetchWithProxy : undefined,
      headers: this.options.apiHost.includes('openrouter.ai')
        ? {
            'HTTP-Referer': 'https://chatboxai.app',
            'X-Title': 'Chatbox AI',
          }
        : undefined,
    });
  }

  protected getChatModel() {
    const provider = this.getProvider();
    return wrapLanguageModel({
      model: provider.chat(this.options.model),
      middleware: extractReasoningMiddleware({ tagName: 'think' }),
    });
  }

  protected getImageModel() {
    const provider = this.getProvider();
    return provider.image('dall-e-3');
  }

  protected getCallSettings() {
    return {
      temperature: this.options.temperature,
      topP: this.options.topP,
    };
  }

  public listModels() {
    return fetchRemoteModels({
      apiHost: this.options.apiHost,
      apiKey: this.options.apiKey,
      useProxy: this.options.useProxy,
    });
  }
}

// Ref: https://platform.openai.com/docs/models/gpt-4
export const openaiModelConfigs = {
  'gpt-4o-mini': {
    maxTokens: 4_096,
    maxContextTokens: 128_000,
    vision: true,
  },
  'gpt-4o-mini-2024-07-18': {
    maxTokens: 4_096,
    maxContextTokens: 128_000,
    vision: true,
  },

  'gpt-4o': {
    maxTokens: 4_096,
    maxContextTokens: 128_000,
    vision: true,
  },
  'gpt-4o-2024-05-13': {
    maxTokens: 4_096,
    maxContextTokens: 128_000,
    vision: true,
  },
  'gpt-4o-2024-08-06': {
    maxTokens: 16_384,
    maxContextTokens: 128_000,
    vision: true,
  },
  'gpt-4o-2024-11-20': {
    maxTokens: 16_384,
    maxContextTokens: 128_000,
    vision: true,
  },
  'chatgpt-4o-latest': {
    maxTokens: 16_384,
    maxContextTokens: 128_000,
    vision: true,
  },

  'gpt-4': {
    maxTokens: 4_096,
    maxContextTokens: 8_192,
    vision: false,
  },
  'gpt-4-turbo': {
    maxTokens: 4_096,
    maxContextTokens: 128_000,
    vision: true,
  },
  'gpt-4-turbo-2024-04-09': {
    maxTokens: 4_096,
    maxContextTokens: 128_000,
    vision: true,
  },
  'gpt-4-0613': {
    maxTokens: 4_096,
    maxContextTokens: 8_192,
    vision: false,
  },
  'gpt-4-32k': {
    maxTokens: 4_096,
    maxContextTokens: 32_768,
    vision: false,
  },
  'gpt-4-32k-0613': {
    maxTokens: 4_096,
    maxContextTokens: 32_768,
    vision: false,
  },
  'gpt-4-1106-preview': {
    maxTokens: 4_096,
    maxContextTokens: 128_000,
    vision: false,
  },
  'gpt-4-0125-preview': {
    maxTokens: 4_096,
    maxContextTokens: 128_000,
    vision: false,
  },
  'gpt-4-turbo-preview': {
    maxTokens: 4_096,
    maxContextTokens: 128_000,
    vision: false,
  },
  'gpt-4-vision-preview': {
    maxTokens: 4_096,
    maxContextTokens: 128_000,
    vision: true,
  },

  o1: {
    maxTokens: 32_768,
    maxContextTokens: 128_000,
    vision: true,
  },
  'o1-2024-12-17': {
    maxTokens: 32_768,
    maxContextTokens: 128_000,
    vision: true,
  },
  'o1-preview': {
    maxTokens: 32_768,
    maxContextTokens: 128_000,
    vision: false,
  },
  'o1-preview-2024-09-12': {
    maxTokens: 32_768,
    maxContextTokens: 128_000,
    vision: false,
  },
  'o1-mini': {
    maxTokens: 65_536,
    maxContextTokens: 128_000,
    vision: false,
  },
  'o1-mini-2024-09-12': {
    maxTokens: 65_536,
    maxContextTokens: 128_000,
    vision: false,
  },
  'o3-mini': {
    maxTokens: 100_000,
    maxContextTokens: 200_000,
    vision: false,
  },
  'o3-mini-2025-01-31': {
    maxTokens: 100_000,
    maxContextTokens: 200_000,
    vision: false,
  },
};

export type OpenAIModel = keyof typeof openaiModelConfigs;
