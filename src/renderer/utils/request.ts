import {
  ApiError,
  BaseError,
  NetworkError,
} from '@src/renderer/lib/ai/core/errors';

function isLocalHost(url: string): boolean {
  const prefixes = [
    'http://localhost:',
    'https://localhost:',
    'http://127.',
    'https://127.',
    'http://[::1]:',
    'https://[::1]:',

    'http://192.168.',
    'https://192.168.',
    'http://10.',
    'https://10.',
    'http://172.',
    'https://172.',
  ];
  return prefixes.some((prefix) => url.startsWith(prefix));
}

async function doRequest(
  url: string,
  options: {
    method: string;
    headers?: RequestInit['headers'];
    body?: RequestInit['body'];
    signal?: AbortSignal;
    retry?: number;
    useProxy?: boolean;
  }
): Promise<Response> {
  const { signal, retry = 3, useProxy = false, body, method } = options;
  const headers = new Headers(options.headers);

  let requestError: BaseError | null = null;
  for (let i = 0; i < retry + 1; i++) {
    try {
      const res = await fetch(url, { method, headers, body, signal });
      if (!res.ok) {
        const err = await res.text().catch((e) => null);
        throw new ApiError(`Status Code ${res.status}, ${err}`);
      }
      return res;
    } catch (e) {
      if (e instanceof BaseError) {
        requestError = e;
      } else {
        const err = e as Error;
        const origin = new URL(url).origin;
        requestError = new NetworkError(err.message, origin);
      }
      if (i < retry) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  }

  if (requestError) {
    throw requestError;
  } else {
    throw new Error('Unknown error');
  }
}

export const apiRequest = {
  async post(
    url: string,
    headers: Record<string, string>,
    body: Record<string, any>,
    options?: {
      signal?: AbortSignal;
      retry?: number;
      useProxy?: boolean;
    }
  ) {
    return doRequest(url, {
      ...options,
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  },
  async get(
    url: string,
    headers: Record<string, string>,
    options?: {
      signal?: AbortSignal;
      retry?: number;
      useProxy?: boolean;
    }
  ) {
    return doRequest(url, { ...options, method: 'GET', headers });
  },
};

export async function fetchWithProxy(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  return doRequest(input.toString(), {
    method: init?.method || 'GET',
    headers: init?.headers,
    body: init?.body,
    signal: init?.signal || undefined,
    useProxy: true,
  });
}
