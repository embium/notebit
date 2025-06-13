// Types
import { Message, MessageTextPart, StreamTextResult } from '@src/types/chats';

// Shared
import {
  ModelInterface,
  OnResultChange,
  onResultChangeWithCancel,
} from '@src/renderer/lib/ai/core/base';

export async function generateText(
  model: ModelInterface,
  params: {
    messages: Message[];
    webBrowsing?: boolean;
  }
): Promise<string> {
  const controller = new AbortController();
  let result: StreamTextResult = {
    contentParts: [],
  };

  try {
    result = await model.chat(params.messages, {
      signal: controller.signal,
      webBrowsing: params.webBrowsing,
    });
  } catch (err) {
    console.error(err);
    if (controller.signal.aborted) {
      return '';
    }
    throw err;
  }

  return (
    result.contentParts
      ?.map((part: { type: string }) => {
        if (part.type === 'text') {
          return (part as MessageTextPart).text;
        }
        return '';
      })
      .join('') || ''
  );
}

export async function streamText(
  model: ModelInterface,
  params: {
    messages: Message[];
    onResultChangeWithCancel: onResultChangeWithCancel;
    webBrowsing?: boolean;
  }
) {
  const controller = new AbortController();
  const cancel = () => controller.abort();

  let result: StreamTextResult = {
    contentParts: [],
  };

  try {
    params.onResultChangeWithCancel({ cancel }); // Pass cancel method first
    const onResultChange: OnResultChange = (data) => {
      result = {
        ...result,
        ...data,
      };
      params.onResultChangeWithCancel({ ...data, cancel });
    };

    result = await model.chat(params.messages, {
      signal: controller.signal,
      onResultChange,
      webBrowsing: params.webBrowsing,
    });
  } catch (err) {
    console.error(err);
    // if a cancellation is performed, do not throw an exception, otherwise the content will be overwritten.
    if (controller.signal.aborted) {
      return result;
    }
    throw err;
  }

  return result;
}
