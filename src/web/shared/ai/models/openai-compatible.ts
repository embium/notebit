import { apiRequest, fetchWithProxy } from '@/shared/utils/request';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import AbstractAISDKModel from '../core/abstract-ai-sdk';
import { ModelInterface } from '../core/base';
import { ApiError } from '../core/errors';

interface OpenAICompatibleSettings {
  apiKey: string;
  apiHost: string;
  model: string;
  useProxy?: boolean;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
}

export default abstract class OpenAICompatible
  extends AbstractAISDKModel
  implements ModelInterface
{
  public name = 'OpenAI Compatible';

  constructor(private settings: OpenAICompatibleSettings) {
    super();
  }

  protected getCallSettings() {
    return {
      maxTokens: this.settings.maxTokens,
      temperature: this.settings.temperature,
      topP: this.settings.topP,
      presencePenalty: this.settings.presencePenalty,
      frequencyPenalty: this.settings.frequencyPenalty,
    };
  }

  protected getChatModel() {
    const provider = createOpenAICompatible({
      name: this.name,
      apiKey: this.settings.apiKey,
      baseURL: this.settings.apiHost,
      fetch: this.settings.useProxy ? fetchWithProxy : undefined,
    });
    return provider.languageModel(this.settings.model);
  }

  public abstract isSupportToolUse(): boolean;

  public async listModels(): Promise<string[]> {
    return fetchRemoteModels({
      apiHost: this.settings.apiHost,
      apiKey: this.settings.apiKey,
      useProxy: this.settings.useProxy,
    }).catch((err) => {
      console.error(err);
      return [];
    });
  }

  public static async embedding({
    modelId,
    endpoint = 'http://127.0.0.1:1234',
    value,
    apiKey,
  }: {
    modelId: string;
    endpoint?: string;
    value: string;
    apiKey?: string;
  }): Promise<number[]> {
    const url = `${endpoint}/embeddings`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: modelId,
        input: value,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get embeddings: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  }
}

interface ListModelsResponse {
  object: 'list';
  data: {
    id: string;
    object: 'model';
    created: number;
    owned_by: string;
  }[];
}

export async function fetchRemoteModels(params: {
  apiHost: string;
  apiKey: string;
  useProxy?: boolean;
}) {
  const response = await apiRequest.get(
    `${params.apiHost}/models`,
    {
      Authorization: `Bearer ${params.apiKey}`,
    },
    {
      useProxy: params.useProxy,
    }
  );
  const json: ListModelsResponse = await response.json();
  if (!json.data) {
    throw new ApiError(JSON.stringify(json));
  }
  return json.data.map((item) => item.id);
}
