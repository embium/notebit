import { ModelHelpers } from '../core/base';
import OpenAICompatible from './openai-compatible';

// https://api-docs.deepseek.com/zh-cn/quick_start/pricing
export const modelConfig = {
  'deepseek-chat': {
    contextWindow: 64_000,
    maxTokens: 8_000,
    vision: false,
  },
  'deepseek-coder': {
    contextWindow: 64_000,
    maxTokens: 8_000,
    vision: false,
  },
  'deepseek-reasoner': {
    contextWindow: 64_000,
    maxTokens: 8_000,
    vision: false,
  },
};

export const deepSeekModels = Object.keys(modelConfig);

const helpers: ModelHelpers = {
  isModelSupportVision: (model: string) => {
    return false;
  },
  isModelSupportToolUse: (model: string) => {
    return false;
  },
};

interface Options {
  deepseekAPIKey: string;
  deepseekModel: string;
  temperature?: number;
  topP?: number;
}

export default class DeepSeek extends OpenAICompatible {
  public name = 'DeepSeek';
  public static helpers = helpers;

  constructor(public options: Options) {
    super({
      apiKey: options.deepseekAPIKey,
      apiHost: 'https://api.deepseek.com/v1',
      model: options.deepseekModel,
      temperature:
        options.deepseekModel === 'deepseek-reasoner'
          ? undefined
          : options.temperature,
      topP:
        options.deepseekModel === 'deepseek-reasoner'
          ? undefined
          : options.topP,
    });
  }

  isSupportToolUse() {
    return helpers.isModelSupportToolUse(this.options.deepseekModel);
  }
}
