import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { ModelHelpers } from '../core/base';
import OpenAICompatible from './openai-compatible';
import { embed } from 'ai';

const helpers: ModelHelpers = {
  isModelSupportVision: (model: string) => {
    model = model.toLowerCase();
    return model.includes('vision') || model.includes('llava');
  },
  isModelSupportToolUse: (model: string) => {
    return false;
  },
};

interface Options {
  lmStudioHost: string;
  lmStudioModel: string;
  temperature?: number;
  topP?: number;
}

export default class LMStudio extends OpenAICompatible {
  public name = 'LM Studio';
  public static helpers = helpers;

  constructor(public options: Options) {
    super({
      apiKey: '',
      apiHost: normalizeApiHost(options.lmStudioHost),
      model: options.lmStudioModel,
      temperature: options.temperature,
      topP: options.topP,
    });
  }

  isSupportToolUse() {
    return helpers.isModelSupportToolUse(this.options.lmStudioModel);
  }
}

function normalizeApiHost(apiHost: string) {
  if (apiHost) {
    apiHost = apiHost.trim();
  }
  if (!apiHost.startsWith('http')) {
    apiHost = 'http://' + apiHost;
  }
  if (apiHost.endsWith('/')) {
    apiHost = apiHost.slice(0, -1);
  }
  if (!apiHost.endsWith('/v1')) {
    apiHost += '/v1';
  }
  return apiHost;
}
