// import { CapacitorHttp } from '@capacitor/core'
import { FetchOptions, ofetch } from 'ofetch';

export interface SearchResultItem {
  title: string;
  abstract: string;
  link: string;
}

export interface SearchResult {
  items: SearchResultItem[];
}

abstract class WebSearch {
  abstract search(query: string, signal?: AbortSignal): Promise<SearchResult>;

  async fetch(url: string, options: FetchOptions) {
    const { origin } = new URL(url);
    {
      /*}
    if (platform.type === 'mobile') {
      const { data } = await CapacitorHttp.request({
        url,
        method: options.method,
        headers: {
          ...(options.headers || ({} as any)),
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
          origin,
          referer: origin,
        },
        params: options.query,
        data: options.body,
      })

      return data
    } else {
    }
     */
    }
    return ofetch(url, options);
  }
}

export default WebSearch;
