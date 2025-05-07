import { AIProviderNoImplementedPaintError } from './errors';
import {
  StreamTextResult,
  Message,
  MessageContentParts,
  MessageToolCalls,
  MessageWebBrowsing,
} from 'src/shared/types/chats';

export interface ModelHelpers {
  isModelSupportVision(model: string): boolean;
  isModelSupportToolUse(model: string): boolean;
}

export interface ModelInterface {
  name: string;
  isSupportToolUse(): boolean;
  isSupportSystemMessage(): boolean;
  chat: (
    messages: Message[],
    options: CallChatCompletionOptions
  ) => Promise<StreamTextResult>;
  paint: (
    prompt: string,
    num: number,
    callback?: (picBase64: string) => any,
    signal?: AbortSignal
  ) => Promise<string[]>;
}

export interface CallChatCompletionOptions {
  signal?: AbortSignal;
  onResultChange?: onResultChange;
  webBrowsing?: boolean;
}

export default abstract class Base implements ModelInterface {
  public name = 'Unknown';
  public static helpers: ModelHelpers;

  public abstract isSupportToolUse(): boolean;
  public isSupportSystemMessage() {
    return true;
  }
  protected abstract callChatCompletion(
    messages: Message[],
    options: CallChatCompletionOptions
  ): Promise<StreamTextResult>;

  protected async callImageGeneration(
    prompt: string,
    signal?: AbortSignal
  ): Promise<string> {
    throw new AIProviderNoImplementedPaintError(this.name);
  }

  public async chat(
    messages: Message[],
    options: CallChatCompletionOptions
  ): Promise<StreamTextResult> {
    return this.callChatCompletion(messages, options);
  }

  public async paint(
    prompt: string,
    num: number,
    callback?: (picBase64: string) => any,
    signal?: AbortSignal
  ): Promise<string[]> {
    const concurrence: Promise<string>[] = [];
    for (let i = 0; i < num; i++) {
      concurrence.push(
        this.callImageGeneration(prompt, signal).then((picBase64) => {
          if (callback) {
            callback(picBase64);
          }
          return picBase64;
        })
      );
    }
    return await Promise.all(concurrence);
  }
}

export interface ResultChange {
  webBrowsing?: MessageWebBrowsing;
  reasoningContent?: string;
  toolCalls?: MessageToolCalls;
  contentParts?: MessageContentParts;
  tokenCount?: number; // 当前消息的 token 数量
  tokensUsed?: number; // 生成当前消息的 token 使用量
}

export type onResultChangeWithCancel = (
  data: ResultChange & { cancel?: () => void }
) => void;
export type onResultChange = (data: ResultChange) => void;
export type OnResultChangeWithCancel = onResultChangeWithCancel;
export type OnResultChange = onResultChange;
