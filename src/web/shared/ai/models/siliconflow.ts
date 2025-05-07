import { ContextWindowSize } from '@shared/constants';
import { ModelMeta } from '@shared/types/chats';
import { ModelHelpers } from '../core/base';
import OpenAICompatible from './openai-compatible';

const helpers: ModelHelpers = {
  isModelSupportVision: (model: string) => {
    const notSupportVisionModels = [
      'deepseek-ai/DeepSeek-R1',
      'deepseek-ai/DeepSeek-V3',
    ];
    return !notSupportVisionModels.includes(model);
  },
  isModelSupportToolUse: (model: string) => {
    return modelMeta[model]?.functionCalling ?? false;
  },
};

interface Options {
  siliconCloudKey: string;
  siliconCloudModel: string;
  temperature?: number;
  topP?: number;
}

export default class SiliconFlow extends OpenAICompatible {
  public name = 'SiliconFlow';
  public static helpers = helpers;

  constructor(public options: Options) {
    super({
      apiKey: options.siliconCloudKey,
      apiHost: 'https://api.siliconflow.cn/v1',
      model: options.siliconCloudModel,
      temperature: options.temperature,
      topP: options.topP,
    });
  }

  isSupportToolUse() {
    return helpers.isModelSupportToolUse(this.options.siliconCloudModel);
  }
}

// Ref: https://siliconflow.cn/zh-cn/models
const modelMeta: ModelMeta = {
  'deepseek-ai/DeepSeek-R1': {
    contextWindow: ContextWindowSize.t64k,
    reasoning: true,
    functionCalling: true,
  },
  'deepseek-ai/DeepSeek-V3': {
    contextWindow: ContextWindowSize.t64k,
    functionCalling: true,
  },

  'Pro/deepseek-ai/DeepSeek-R1': {
    contextWindow: ContextWindowSize.t64k,
    reasoning: true,
    functionCalling: true,
  },
  'Pro/deepseek-ai/DeepSeek-V3': {
    contextWindow: ContextWindowSize.t64k,
    functionCalling: true,
  },

  'Qwen/Qwen2.5-7B-Instruct': {
    contextWindow: ContextWindowSize.t32k,
    functionCalling: true,
  },
  'Qwen/Qwen2.5-14B-Instruct': {
    contextWindow: ContextWindowSize.t32k,
    functionCalling: true,
  },
  'Qwen/Qwen2.5-32B-Instruct': {
    contextWindow: ContextWindowSize.t32k,
    functionCalling: true,
  },
  'Qwen/Qwen2.5-72B-Instruct': {
    contextWindow: ContextWindowSize.t32k,
    functionCalling: true,
  },
  'Qwen/Qwen2.5-VL-32B-Instruct': {
    contextWindow: ContextWindowSize.t128k,
    vision: true,
  },
  'Qwen/Qwen2.5-VL-72B-Instruct': {
    contextWindow: ContextWindowSize.t128k,
    vision: true,
  },
  'Qwen/QVQ-72B-Preview': {
    contextWindow: ContextWindowSize.t128k,
    vision: true,
  },
  'Qwen/QwQ-32B': {
    contextWindow: ContextWindowSize.t32k,
    functionCalling: true,
  },
  'Pro/Qwen/Qwen2.5-VL-7B-Instruct': {
    contextWindow: ContextWindowSize.t32k,
    vision: true,
  },
};

export const siliconFlowModels = Array.from(Object.keys(modelMeta)).sort();
