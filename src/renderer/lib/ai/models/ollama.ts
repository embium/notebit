import type { ModelHelpers } from '../core/base';
import OpenAICompatible, { fetchRemoteModels } from './openai-compatible';

const helpers: ModelHelpers = {
  isModelSupportVision: (model: string) => {
    return [
      'gemma3',
      'llava',
      'llama3.2-vision',
      'llava-llama3',
      'moondream',
      'bakllava',
      'llava-phi3',
      'granite3.2-vision',
    ].some((m) => model.startsWith(m));
  },
  isModelSupportToolUse: (model: string) => {
    return [
      'qwq',
      'llama3.3',
      'llama3.2',
      'llama3.1',
      'mistral',
      'qwen2.5',
      'qwen2.5-coder',
      'qwen2',
      'mistral-nemo',
      'mixtral',
      'smollm2',
      'mistral-small',
      'command-r',
      'hermes3',
      'mistral-large',
    ].some((m) => model.startsWith(m));
  },
};

interface Options {
  ollamaHost: string;
  ollamaModel: string;
  temperature: number;
}

export default class Ollama extends OpenAICompatible {
  public name = 'Ollama';
  public static helpers = helpers;
  private static ollamaInstance: any;

  constructor(public options: Options) {
    super({
      apiKey: 'ollama',
      apiHost: normalizeApiHost(options.ollamaHost),
      model: options.ollamaModel,
      ...options,
    });
  }

  listModels(): Promise<string[]> {
    return fetchRemoteModels({
      apiHost: normalizeApiHost(this.options.ollamaHost),
      apiKey: 'ollama', // Ollama doesn't need a real API key
      useProxy: false,
    });
  }

  isSupportToolUse(): boolean {
    return helpers.isModelSupportToolUse(this.options.ollamaModel);
  }
}

function normalizeApiHost(apiHost: string) {
  let host = apiHost.trim();
  if (host.endsWith('/')) {
    host = host.slice(0, -1);
  }
  if (!host.startsWith('http')) {
    host = 'http://' + host;
  }
  if (host === 'http://localhost:11434') {
    host = 'http://127.0.0.1:11434'; // 让其在浏览器中也能访问
  }
  if (!host.endsWith('/v1')) {
    host += '/v1';
  }
  return host;
}
