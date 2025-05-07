import { createPerplexity } from '@ai-sdk/perplexity';
import { extractReasoningMiddleware, wrapLanguageModel } from 'ai';
import AbstractAISDKModel from '../core/abstract-ai-sdk';
import { ModelHelpers } from '../core/base';

const helpers: ModelHelpers = {
  isModelSupportVision: (model: string) => {
    return false;
  },
  isModelSupportToolUse: (model: string) => {
    return false;
  },
};

interface Options {
  perplexityApiKey: string;
  perplexityModel: string;
  temperature?: number;
  topP?: number;
}

export default class Perplexity extends AbstractAISDKModel {
  public name = 'Perplexity API';
  public static helpers = helpers;

  constructor(public options: Options) {
    super();
  }

  protected getChatModel() {
    const provider = createPerplexity({
      apiKey: this.options.perplexityApiKey,
    });
    return wrapLanguageModel({
      model: provider.languageModel(this.options.perplexityModel),
      middleware: extractReasoningMiddleware({ tagName: 'think' }),
    });
  }

  isSupportToolUse() {
    return helpers.isModelSupportToolUse(this.options.perplexityModel);
  }
}

export const perplexityModels = [
  'sonar-deep-research',
  'sonar-reasoning-pro',
  'sonar-reasoning',
  'sonar-pro',
  'sonar',
];
