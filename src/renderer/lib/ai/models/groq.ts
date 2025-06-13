import { ModelHelpers } from '../core/base';
import OpenAICompatible from './openai-compatible';

const helpers: ModelHelpers = {
  isModelSupportVision: (model: string) => {
    return model.includes('vision');
  },
  isModelSupportToolUse: (model: string) => {
    return false;
  },
};

interface Options {
  groqAPIKey: string;
  groqModel: string;
  temperature: number;
}

export default class Groq extends OpenAICompatible {
  public name = 'Groq';
  public static helpers = helpers;

  constructor(public options: Options) {
    super({
      apiKey: options.groqAPIKey,
      apiHost: 'https://api.groq.com/openai/v1',
      model: options.groqModel,
      temperature: options.temperature,
    });
  }

  isSupportToolUse() {
    return helpers.isModelSupportToolUse(this.options.groqModel);
  }
}
