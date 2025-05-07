import { apiRequest } from '@/shared/utils/request';
import { createAnthropic } from '@ai-sdk/anthropic';
import { ModelMeta } from '@shared/types/chats';
import AbstractAISDKModel from '../core/abstract-ai-sdk';
import { ModelHelpers } from '../core/base';
import { ApiError } from '../core/errors';

// https://docs.anthropic.com/claude/docs/models-overview
const modelConfig: ModelMeta = {
  'claude-3-7-sonnet-latest': {
    contextWindow: 200_000,
    maxOutput: 8192,
    vision: true,
    functionCalling: true,
  },
  'claude-3-5-sonnet-latest': {
    contextWindow: 200_000,
    maxOutput: 8192,
    vision: true,
  },
  'claude-3-5-haiku-latest': {
    contextWindow: 200_000,
    vision: true,
  },
  'claude-3-opus-latest': {
    contextWindow: 200_000,
    maxOutput: 8192,
    vision: true,
  },
};

export const claudeModels = Object.keys(modelConfig);

const helpers: ModelHelpers = {
  isModelSupportVision: (model: string) => {
    return true;
  },
  isModelSupportToolUse: (model: string) => {
    return true;
  },
};

interface Options {
  claudeApiKey: string;
  claudeApiHost: string;
  claudeModel: string;
}

export default class Claude extends AbstractAISDKModel {
  public name = 'Claude';
  public static helpers = helpers;

  constructor(public options: Options) {
    super();
  }

  protected getChatModel() {
    const provider = createAnthropic({
      baseURL: this.options.claudeApiHost,
      apiKey: this.options.claudeApiKey,
      headers: {
        'anthropic-dangerous-direct-browser-access': 'true',
      },
    });
    return provider.languageModel(this.options.claudeModel);
  }

  isSupportToolUse() {
    return helpers.isModelSupportToolUse(this.options.claudeModel);
  }

  // https://docs.anthropic.com/en/docs/api/models
  public async listModels(): Promise<string[]> {
    type Response = {
      data: { id: string; type: string }[];
    };
    const url = `${this.options.claudeApiHost}/models?limit=990`;
    const res = await apiRequest.get(url, {
      'anthropic-version': '2023-06-01',
      'x-api-key': this.options.claudeApiKey,
    });
    const json: Response = await res.json();
    if (!json['data']) {
      throw new ApiError(JSON.stringify(json));
    }
    return json['data']
      .filter((item) => item.type === 'model')
      .map((item) => item.id);
  }
}
