import { store } from '@shared/storage';
import { saveImage } from '@/shared/utils/image';
import {
  cloneMessage,
  getMessageText,
  sequenceMessages,
} from '@/shared/utils/message';
import { GoogleGenerativeAIProviderMetadata } from '@ai-sdk/google';

import {
  APICallError,
  CoreMessage,
  CoreSystemMessage,
  FilePart,
  experimental_generateImage as generateImage,
  ImageModel,
  ImagePart,
  jsonSchema,
  LanguageModelV1,
  streamText,
  TextPart,
  tool,
  ToolCallPart,
  ToolSet,
} from 'ai';
import dayjs from 'dayjs';
import { compact, isEmpty } from 'lodash';
import {
  Message,
  MessageContentParts,
  MessageImagePart,
  MessageTextPart,
  MessageToolCalls,
  MessageWebBrowsing,
  StreamTextResult,
} from '@shared/types/chats';
import { webSearchTool as rawWebSearchTool } from '../../search/providers';
import { CallChatCompletionOptions, ModelInterface } from './base';
import { ApiError } from './errors';
import { getStorageData } from '@/shared/utils/storage';

const webSearchTool = tool({
  description: rawWebSearchTool.function.description,
  parameters: jsonSchema(rawWebSearchTool.function.parameters as any),
});

// ai sdk CallSettings类型的子集
export interface CallSettings {
  temperature?: number;
  topP?: number;
  providerOptions?: CoreSystemMessage['providerOptions'];
  tools?: ToolSet;
}

export default abstract class AbstractAISDKModel implements ModelInterface {
  public name = 'AI SDK Model';
  public injectDefaultMetadata = true;

  public abstract isSupportToolUse(): boolean;
  protected abstract getChatModel(
    options: CallChatCompletionOptions
  ): LanguageModelV1;

  protected getImageModel(): ImageModel | null {
    return null;
  }

  public isSupportSystemMessage() {
    return true;
  }

  protected getCallSettings(options: CallChatCompletionOptions): CallSettings {
    return {};
  }

  public async chat(
    messages: Message[],
    options: CallChatCompletionOptions
  ): Promise<StreamTextResult> {
    try {
      return await this._callChatCompletion(messages, options);
    } catch (e) {
      // 如果当前模型不支持图片输入，抛出对应的错误
      if (
        e instanceof ApiError &&
        e.message.includes(
          'Invalid content type. image_url is only supported by certain models.'
        )
      ) {
        // 根据当前 IP，判断是否在错误中推荐 Chatbox AI 4
        /*
        const remoteConfig = settingActions.getRemoteConfig()
        if (remoteConfig.setting_chatboxai_first) {
          throw ChatboxAIAPIError.fromCodeName('model_not_support_image', 'model_not_support_image')
        } else {
          throw ChatboxAIAPIError.fromCodeName('model_not_support_image', 'model_not_support_image_2')
        }
        */
      }
      throw e;
    }
  }

  public async paint(
    prompt: string,
    num: number,
    callback?: (picBase64: string) => any,
    signal?: AbortSignal
  ): Promise<string[]> {
    const imageModel = this.getImageModel();
    if (!imageModel) {
      throw new ApiError('Provider doesnt support image generation');
    }
    const result = await generateImage({
      model: imageModel,
      prompt,
      n: num,
      abortSignal: signal,
    });
    const dataUrls = result.images.map(
      (image) => `data:${image.mimeType};base64,${image.base64}`
    );
    for (const dataUrl of dataUrls) {
      callback?.(dataUrl);
    }
    return dataUrls;
  }

  private async _callChatCompletion(
    rawMessages: Message[],
    options: CallChatCompletionOptions
  ): Promise<StreamTextResult> {
    const model = this.getChatModel(options);

    if (this.injectDefaultMetadata && this.isSupportSystemMessage()) {
      rawMessages = injectModelSystemPrompt(model.modelId, rawMessages);
    }
    if (!this.isSupportSystemMessage()) {
      rawMessages = rawMessages.filter((m) => m.role !== 'system');
    }

    const messages = sequenceMessages(rawMessages);
    const coreMessages = await convertToCoreMessages(messages);
    const result = streamText({
      model,
      maxSteps: 1,
      messages: coreMessages,
      tools: options?.webBrowsing ? { web_search: webSearchTool } : undefined,
      abortSignal: options.signal,
      ...this.getCallSettings(options),
    });

    let blockIndex = 0;
    let contentParts: MessageContentParts = [];
    let reasoningContent = '';
    const toolCalls: MessageToolCalls = {};

    for await (const chunk of result.fullStream) {
      if (chunk.type === 'text-delta') {
        if (!contentParts[blockIndex]) {
          contentParts[blockIndex] = { type: 'text', text: '' };
        } else if (contentParts[blockIndex].type === 'image') {
          contentParts[++blockIndex] = { type: 'text', text: '' };
        }

        (contentParts[blockIndex] as MessageTextPart).text += chunk.textDelta;
      } else if (chunk.type === 'reasoning') {
        reasoningContent += chunk.textDelta;
      } else if (chunk.type === 'tool-call') {
        toolCalls[chunk.toolCallId] = {
          id: chunk.toolCallId,
          function: {
            name: chunk.toolName,
            arguments: JSON.stringify(chunk.args),
          },
        };
      } else if (chunk.type === 'file' && chunk.mimeType.startsWith('image/')) {
        const storageKey = await saveImage(
          `data:${chunk.mimeType};base64,${chunk.base64}`
        );
        let image = { type: 'image', storageKey } as MessageImagePart;
        if (blockIndex < contentParts.length) {
          contentParts[++blockIndex] = image;
        } else {
          contentParts.push(image);
        }
      } else if (chunk.type === 'error') {
        const error = chunk.error;
        if (APICallError.isInstance(error)) {
          throw new ApiError(`Error from ${this.name}`, error.responseBody);
        }
        throw new ApiError(`Error from ${this.name}: ${chunk.error}`);
      } else {
        continue;
      }
      options.onResultChange?.({ reasoningContent, toolCalls, contentParts });
    }

    const [sources, usage, providerMetadata] = await Promise.all([
      result.sources, // Known to be returned by Perplexity and Gemini, others may follow
      result.usage,
      result.providerMetadata,
    ]);
    const metadata = providerMetadata?.google as
      | GoogleGenerativeAIProviderMetadata
      | undefined;
    const groundingMetadata = metadata?.groundingMetadata;
    let webBrowsing: MessageWebBrowsing | undefined;
    if (sources && sources.length > 0) {
      webBrowsing = {
        query: groundingMetadata?.webSearchQueries || [],
        links: sources.map((source) => ({
          title: source.title || source.url,
          url: source.url,
        })),
      };
    }
    options.onResultChange?.({
      contentParts,
      reasoningContent,
      toolCalls,
      webBrowsing,
      tokenCount: usage?.completionTokens,
      tokensUsed: usage?.totalTokens,
    });

    return { contentParts, reasoningContent, usage };
  }
}

async function convertContentParts<
  T extends TextPart | ImagePart | FilePart | ToolCallPart,
>(
  contentParts: MessageContentParts,
  imageType: 'image' | 'file'
): Promise<T[]> {
  return compact(
    await Promise.all(
      contentParts.map(async (c) => {
        if (c.type === 'text') {
          return { type: 'text', text: c.text! } as T;
        } else if (c.type === 'image') {
          // Get the document from PouchDB
          const doc = await getStorageData(c.storageKey);
          // Access the image data - the structure depends on how you're storing it
          // This is a common pattern for PouchDB documents
          const imageContent =
            typeof doc === 'object' && doc !== null
              ? (doc as any).data || '' // Cast to any to access potential fields
              : doc; // If the document itself is the string data
          // Now we can safely use string methods
          const imageData =
            typeof imageContent === 'string'
              ? imageContent.replace(/^data:image\/[^;]+;base64,/, '')
              : '';
          return {
            type: imageType,
            ...(imageType === 'image'
              ? { image: imageData }
              : { data: imageData }),
            mimeType: 'image/png',
          } as T;
        } else if (c.type === 'tool-call') {
          return {
            type: 'tool-call',
            toolCallId: c.toolCallId,
            toolName: c.toolName,
            args: c.args,
          } as T;
        }
        return null;
      })
    )
  );
}

async function convertUserContentParts(
  contentParts: MessageContentParts
): Promise<Array<TextPart | ImagePart>> {
  return convertContentParts<TextPart | ImagePart>(contentParts, 'image');
}

async function convertAssistantContentParts(
  contentParts: MessageContentParts
): Promise<Array<TextPart | FilePart>> {
  return convertContentParts<TextPart | FilePart>(contentParts, 'file');
}

async function convertToCoreMessages(
  messages: Message[]
): Promise<CoreMessage[]> {
  return Promise.all(
    messages.map(async (m) => {
      switch (m.role) {
        case 'system':
          return { role: 'system', content: getMessageText(m) };
        case 'user': {
          const contentParts = await convertUserContentParts(
            m.contentParts || []
          );
          return {
            role: 'user',
            content: contentParts,
          };
        }
        case 'assistant': {
          const contentParts = m.contentParts || [];
          if (!isEmpty(m.toolCalls)) {
            for (const toolCall of Object.values(m.toolCalls)) {
              contentParts.push({
                type: 'tool-call',
                toolCallId: toolCall.id,
                toolName: toolCall.function.name,
                args: toolCall.function.arguments,
              });
            }
          }
          return {
            role: 'assistant',
            content: await convertAssistantContentParts(contentParts),
          };
        }
        case 'tool':
          return {
            role: 'tool',
            content: [
              {
                type: 'tool-result',
                toolCallId: m.id,
                toolName: m.name!,
                result: getMessageText(m),
              },
            ],
          };
        default:
          const _exhaustiveCheck: never = m.role;
          throw new Error(`Unkown role: ${_exhaustiveCheck}`);
      }
    })
  );
}

/**
 * 在 system prompt 中注入模型信息
 * @param model
 * @param messages
 * @returns
 */
function injectModelSystemPrompt(model: string, messages: Message[]) {
  const metadataPrompt = `Current model: ${model}\nCurrent date: ${dayjs().format('YYYY-MM-DD')}\n`;
  let hasInjected = false;
  return messages.map((m) => {
    if (m.role === 'system' && !hasInjected) {
      m = cloneMessage(m); // 复制，防止原始数据在其他地方被直接渲染使用
      m.contentParts = [
        { type: 'text', text: metadataPrompt + getMessageText(m) },
      ];
      hasInjected = true;
    }
    return m;
  });
}
