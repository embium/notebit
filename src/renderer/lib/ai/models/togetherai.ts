import { ModelHelpers } from '../core/base';
import OpenAICompatible, { fetchRemoteModels } from './openai-compatible';
import { apiRequest } from '@src/renderer/utils/request';

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
  togetherAIHost: string;
  togetherAIModel: string;
  togetherAIKey: string;
  temperature?: number;
  topP?: number;
}

export default class TogetherAI extends OpenAICompatible {
  public name = 'Together AI';
  public static helpers = helpers;

  constructor(public options: Options) {
    super({
      apiKey: options.togetherAIKey,
      apiHost: 'https://api.together.xyz/v1',
      model: options.togetherAIModel,
      temperature: options.temperature,
      topP: options.topP,
    });
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await apiRequest.get(
        `${this.options.togetherAIHost}/models`,
        {
          Authorization: `Bearer ${this.options.togetherAIKey}`,
        },
        {
          useProxy: false,
        }
      );

      const json = await response.json();

      // Check if the response is an array (TogetherAI format)
      if (Array.isArray(json)) {
        // Filter for chat models only if needed
        // const chatModels = json.filter(model => model.type === 'chat');
        // return chatModels.map(model => model.id);

        // Or return all model IDs
        return json.map((model) => model.id);
      }

      // Fallback to the original method if the response format is different
      return fetchRemoteModels({
        apiHost: this.options.togetherAIHost,
        apiKey: this.options.togetherAIKey,
        useProxy: false,
      });
    } catch (error) {
      console.error('Failed to fetch TogetherAI models:', error);
      return [];
    }
  }

  isSupportToolUse() {
    return helpers.isModelSupportToolUse(this.options.togetherAIModel);
  }
}
