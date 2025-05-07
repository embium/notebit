import { apiRequest } from '@/shared/utils/request';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { LanguageModelV1 } from 'ai';
import AbstractAISDKModel, { CallSettings } from '../core/abstract-ai-sdk';
import { CallChatCompletionOptions, ModelHelpers } from '../core/base';
import { ApiError } from '../core/errors';

export type GeminiModel = keyof typeof modelConfig;

export type GeminiModelInfo = {
  name: string;
  version: string;
  displayName: string;
  description: string;
  inputTokenLimit: number;
  outputTokenLimit: number;
  supportedGenerationMethods: string[];
  temperature: number;
  topP: number;
  topK: number;
};

export type ModelsResponse = {
  models: GeminiModelInfo[];
};

// https://ai.google.dev/models/gemini?hl=zh-cn
export const modelConfig = {
  'gemini-2.0-flash-exp': {
    vision: true,
  },
  'gemini-2.0-flash-thinking-exp': {
    vision: true,
  },
  'gemini-2.0-flash-thinking-exp-1219': {
    vision: true,
  },
  'gemini-1.5-pro-latest': {
    vision: true,
  },
  'gemini-1.5-flash-latest': {
    vision: true,
  },
  'gemini-1.5-pro-exp-0827': {
    vision: true,
  },
  'gemini-1.5-flash-exp-0827': {
    vision: true,
  },
  'gemini-1.5-flash-8b-exp-0924': {
    vision: true,
  },
  'gemini-pro': {
    vision: false,
  },
};

export const geminiModels: GeminiModel[] = Object.keys(
  modelConfig
) as GeminiModel[];

const helpers: ModelHelpers = {
  isModelSupportVision: (model: string) => {
    if (model.startsWith('gemini-pro') && !model.includes('vision')) {
      return false;
    }
    if (model.startsWith('gemini-1.0')) {
      return false;
    }
    return true;
  },
  isModelSupportToolUse: (model: string) => {
    return true;
  },
};

interface Options {
  geminiAPIKey: string;
  geminiAPIHost: string;
  geminiModel: GeminiModel;
  temperature: number;
}

export default class Gemeni extends AbstractAISDKModel {
  public name = 'Google Gemini';
  public static helpers = helpers;

  constructor(public options: Options) {
    super();
    this.injectDefaultMetadata = false;
  }

  isSupportToolUse() {
    return helpers.isModelSupportToolUse(this.options.geminiModel);
  }

  isSupportSystemMessage() {
    return ![
      'gemini-2.0-flash-exp',
      'gemini-2.0-flash-thinking-exp',
      'gemini-2.0-flash-exp-image-generation',
    ].includes(this.options.geminiModel);
  }

  protected getChatModel(options: CallChatCompletionOptions): LanguageModelV1 {
    const provider = createGoogleGenerativeAI({
      apiKey: this.options.geminiAPIKey,
      baseURL: `${this.options.geminiAPIHost}/v1beta` || undefined,
    });

    return provider.chat(this.options.geminiModel, {
      useSearchGrounding: options.webBrowsing,
      structuredOutputs: false,
      safetySettings: [
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_NONE',
        },
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          threshold: 'BLOCK_NONE',
        },
      ],
    });
  }

  protected getCallSettings(): CallSettings {
    const settings: CallSettings = {};
    if (
      [
        'gemini-2.0-flash-exp',
        'gemini-2.0-flash-exp-image-generation',
      ].includes(this.options.geminiModel)
    ) {
      settings.providerOptions = {
        google: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      };
    }
    return settings;
  }

  async listModels(): Promise<GeminiModelInfo[]> {
    // https://ai.google.dev/api/models#method:-models.list

    const res = await apiRequest.get(
      `${this.options.geminiAPIHost}/v1beta/models?key=${this.options.geminiAPIKey}`,
      {}
    );
    const json: ModelsResponse = await res.json();
    if (!json.models) {
      throw new ApiError(JSON.stringify(json));
    }
    return json.models
      .filter((m) =>
        m.supportedGenerationMethods.some((method) =>
          method.includes('generate')
        )
      )
      .filter((m) => m.name.includes('gemini'));
  }
}

// #!/bin/bash

// API_KEY="YOUR_API_KEY"

// curl \
//   -X POST 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key='${API_KEY} \
//   -H 'Content-Type: application/json' \
//   -d @<(echo '{
//   "contents": [
//     {
//       "role": "user",
//       "parts": [
//         {
//           "text": "hi"
//         }
//       ]
//     },
//     {
//       "role": "model",
//       "parts": [
//         {
//           "text": "Hello! How can I assist you today? I'm here to answer your"
//         }
//       ]
//     },
//     {
//       "role": "user",
//       "parts": [
//         {
//           "text": "<div><br></div>hi"
//         }
//       ]
//     }
//   ],
//   "generationConfig": {
//     "temperature": 0.9,
//     "topK": 1,
//     "topP": 1,
//     "maxOutputTokens": 2048,
//     "stopSequences": []
//   },
//   "safetySettings": [
//     {
//       "category": "HARM_CATEGORY_HARASSMENT",
//       "threshold": "BLOCK_MEDIUM_AND_ABOVE"
//     },
//     {
//       "category": "HARM_CATEGORY_HATE_SPEECH",
//       "threshold": "BLOCK_MEDIUM_AND_ABOVE"
//     },
//     {
//       "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
//       "threshold": "BLOCK_MEDIUM_AND_ABOVE"
//     },
//     {
//       "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
//       "threshold": "BLOCK_MEDIUM_AND_ABOVE"
//     }
//   ]
// }')

// {
//     "candidates": [
//         {
//             "content": {
//                 "parts": [
//                     {
//                         "text": "Hello again! Is there anything specific you'd like to ask or need assistance with? I'm here to help in any way I can."
//                     }
//                 ],
//                 "role": "model"
//             },
//             "finishReason": "STOP",
//             "index": 0,
//             "safetyRatings": [
//                 {
//                     "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
//                     "probability": "NEGLIGIBLE"
//                 },
//                 {
//                     "category": "HARM_CATEGORY_HATE_SPEECH",
//                     "probability": "NEGLIGIBLE"
//                 },
//                 {
//                     "category": "HARM_CATEGORY_HARASSMENT",
//                     "probability": "NEGLIGIBLE"
//                 },
//                 {
//                     "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
//                     "probability": "NEGLIGIBLE"
//                 }
//             ]
//         }
//     ],
//     "promptFeedback": {
//         "safetyRatings": [
//             {
//                 "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
//                 "probability": "NEGLIGIBLE"
//             },
//             {
//                 "category": "HARM_CATEGORY_HATE_SPEECH",
//                 "probability": "NEGLIGIBLE"
//             },
//             {
//                 "category": "HARM_CATEGORY_HARASSMENT",
//                 "probability": "NEGLIGIBLE"
//             },
//             {
//                 "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
//                 "probability": "NEGLIGIBLE"
//             }
//         ]
//     }
// }
