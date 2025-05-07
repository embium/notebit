import { ContextWindowSize } from '@shared/constants';
import { ModelHelpers } from '../core/base';
import OpenAICompatible from './openai-compatible';

// https://x.ai/api#pricing
const modelConfig = {
  'grok-3-beta': {
    contextWindow: ContextWindowSize.t128k,
    vision: false,
  },
  'grok-3-mini-beta': {
    contextWindow: ContextWindowSize.t128k,
    vision: false,
  },
  'grok-2-vision-1212': {
    contextWindow: 8192,
    vision: true,
  },
  'grok-2-image-1212': {
    contextWindow: ContextWindowSize.t128k,
    vision: false,
  },
  'grok-2-1212': {
    contextWindow: ContextWindowSize.t128k,
    vision: false,
  },
  'grok-vision-beta': {
    contextWindow: 8192,
    vision: true,
  },
  'grok-beta': {
    contextWindow: ContextWindowSize.t128k,
    vision: false,
  },
};

export const xAIModels = Object.keys(modelConfig);

const helpers: ModelHelpers = {
  isModelSupportVision: (model: string) => {
    return model.includes('vision');
  },
  isModelSupportToolUse: (model: string) => {
    return true;
  },
};

interface Options {
  xAIKey: string;
  xAIModel: string;
  temperature?: number;
  topP?: number;
}

export default class XAI extends OpenAICompatible {
  public name = 'xAI';
  public static helpers = helpers;

  constructor(public options: Options) {
    super({
      apiKey: options.xAIKey,
      apiHost: 'https://api.x.ai/v1',
      model: options.xAIModel,
      temperature: options.temperature,
      topP: options.topP,
    });
  }

  isSupportToolUse() {
    return helpers.isModelSupportToolUse(this.options.xAIModel);
  }
}
