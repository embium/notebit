import { Settings, Config, ModelProvider } from '@shared/types/chats';
import Gemini from './gemini';
import Ollama from './ollama';
import type { ModelInterface } from '../core/base';

export function getModel(setting: Settings, config: Config): ModelInterface {
  switch (setting.aiProvider) {
    case ModelProvider.Gemini:
      return new Gemini(setting);
    case ModelProvider.Ollama:
      return new Ollama(setting);
    default:
      throw new Error('Cannot find model with provider: ' + setting.aiProvider);
  }
}

export const aiProviderNameHash: Record<ModelProvider, string> = {
  [ModelProvider.Gemini]: 'Google Gemini API',
  [ModelProvider.Ollama]: 'Ollama API',
  [ModelProvider.OpenAI]: 'OpenAI API',
  [ModelProvider.Azure]: 'Azure API',
  [ModelProvider.Claude]: 'Claude API',
  [ModelProvider.Groq]: 'Groq API',
  [ModelProvider.DeepSeek]: 'DeepSeek API',
  [ModelProvider.SiliconCloud]: 'SiliconCloud API',
  [ModelProvider.LMStudio]: 'LMStudio API',
};

export const AIModelProviderMenuOptionList = [
  {
    value: ModelProvider.Gemini,
    label: aiProviderNameHash[ModelProvider.Gemini],
    featured: true,
    disabled: false,
  },
  {
    value: ModelProvider.Ollama,
    label: aiProviderNameHash[ModelProvider.Ollama],
    disabled: false,
  },
];

function keepRange(num: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, num));
}
