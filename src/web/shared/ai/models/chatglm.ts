import { ModelMeta } from '@shared/types/chats';
import { ModelHelpers } from '../core/base';
import OpenAICompatible from './openai-compatible';

const modelConfig: ModelMeta = {
  'glm-4-plus': {
    contextWindow: 128_000,
    functionCalling: true,
    vision: false,
  },
  'glm-4-air': {
    contextWindow: 128_000,
    functionCalling: true,
    vision: false,
  },
  'glm-4-flash': {
    contextWindow: 128_000,
    functionCalling: true,
  },
  'glm-4v-plus-0111': {
    contextWindow: 16_000,
    vision: true,
  },
  'glm-4v-flash': {
    contextWindow: 16_000,
    vision: true,
  },
};

export const chatglmModels = Object.keys(modelConfig);

const helpers: ModelHelpers = {
  isModelSupportVision: (model: string) => {
    return modelConfig[model]?.vision ?? false;
  },
  isModelSupportToolUse: (model: string) => {
    return modelConfig[model]?.functionCalling ?? false;
  },
};

interface Options {
  chatglmApiKey: string;
  chatglmModel: string;
}

export default class ChatGLM extends OpenAICompatible {
  public name = 'ChatGLM';
  public static helpers = helpers;

  constructor(public options: Options) {
    super({
      apiKey: options.chatglmApiKey,
      apiHost: 'https://open.bigmodel.cn/api/paas/v4/',
      model: options.chatglmModel,
    });
  }

  isSupportToolUse() {
    return helpers.isModelSupportToolUse(this.options.chatglmModel);
  }

  public async listModels() {
    return [];
  }
}
