import { isEmpty } from 'lodash';

// Types
import {
  Message,
  MessageToolCalls,
  StreamTextResult,
} from '@shared/types/chats';

// State
import {
  ModelInterface,
  OnResultChange,
  onResultChangeWithCancel,
} from '@/shared/ai/core/base';

// Utils
import { webSearchExecutor } from '@/shared/search/providers';

export async function callTool(
  name: string,
  args: any,
  { signal }: { signal?: AbortSignal }
) {
  if (name === 'web_search') {
    return webSearchExecutor(args, { abortSignal: signal });
  }
}

async function handleToolCalls(
  messages: Message[],
  toolCalls: MessageToolCalls,
  {
    onResultChange,
    signal,
  }: { onResultChange: OnResultChange; signal: AbortSignal }
) {
  for (const toolCall of Object.values(toolCalls)) {
    const name = toolCall.function.name;
    let args: any;
    try {
      args = JSON.parse(toolCall.function.arguments);
    } catch (err) {
      if (err instanceof SyntaxError) {
        continue;
      }
      throw err;
    }
    const toolResult = await callTool(name, args, { signal });
    if (name === 'web_search' && toolResult) {
      onResultChange({
        webBrowsing: {
          query: args.query.split(' '),
          links: toolResult.searchResults.map((it) => {
            return { title: it.title, url: it.link };
          }),
        },
      });
    }
    messages.push({
      id: toolCall.id, // store tool_call_id in id field
      role: 'tool',
      name: toolCall.function.name,
      contentParts: toolResult
        ? [{ type: 'text', text: JSON.stringify(toolResult) }]
        : [],
    });
  }
  return messages;
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
  let toolCalls: MessageToolCalls | undefined;

  try {
    params.onResultChangeWithCancel({ cancel }); // 这里先传递 cancel 方法
    const onResultChange: OnResultChange = (data) => {
      result = {
        ...result,
        ...data,
      };
      toolCalls = data.toolCalls;
      params.onResultChangeWithCancel({ ...data, cancel });
    };

    if (params.webBrowsing && !model.isSupportToolUse()) {
    }

    result = await model.chat(params.messages, {
      signal: controller.signal,
      onResultChange,
      webBrowsing: params.webBrowsing,
    });

    if (!isEmpty(toolCalls)) {
      params.messages.push({
        id: '',
        role: 'assistant',
        toolCalls,
        contentParts: result.contentParts,
      });
      const messages = await handleToolCalls(params.messages, toolCalls, {
        onResultChange,
        signal: controller.signal,
      });
      result = await model.chat(messages, {
        onResultChange,
        signal: controller.signal,
      });
    }
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
