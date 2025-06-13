import { cachified } from '@epic-web/cachified';
import { truncate } from 'lodash';
import type { SearchResultItem } from '../base';
import { BingNewsSearch } from './bing-news';
import { BingSearch } from './bing';
import { TavilySearch } from './tavily';
import WebSearch from '../base';

const MAX_CONTEXT_ITEMS = 10;

// 根据配置的搜索提供方来选择搜索服务
function getSearchProviders() {
  const selectedProviders: WebSearch[] = [];
  const provider = 'bing';

  switch (provider) {
    case 'bing':
      selectedProviders.push(new BingSearch());
      break;
    default:
      throw new Error(`Unsupported search provider: ${provider}`);
  }

  return selectedProviders;
}

async function _searchRelatedResults(query: string, signal?: AbortSignal) {
  const providers = getSearchProviders();
  const results = await Promise.all(
    providers.map(async (provider) => {
      try {
        const result = await provider.search(query, signal);
        console.debug(`web search result for "${query}":`, result.items);
        return result;
      } catch (err) {
        console.error(err);
        return { items: [] };
      }
    })
  );

  const items: SearchResultItem[] = [];

  // add items in turn
  let i = 0;
  let hasMore = false;
  do {
    hasMore = false;
    for (const result of results) {
      const item = result.items[i];
      if (item) {
        hasMore = true;
        items.push(item);
      } else {
        continue;
      }
    }
    i++;
  } while (hasMore && items.length < MAX_CONTEXT_ITEMS);

  console.debug('web search items', items);

  return items.map((item) => ({
    title: item.title,
    snippet: truncate(item.abstract, { length: 150 }),
    link: item.link,
  }));
}

const cache = new Map();

export const webSearchTool = {
  type: 'function',
  function: {
    name: 'web_search',
    description:
      'a search engine. useful for when you need to answer questions about current events. input should be a search query. prefer English query. query should be short and concise',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'the search query',
        },
      },
      required: ['query'],
    },
  },
};

export const webSearchExecutor = async (
  { query }: { query: string },
  { abortSignal }: { abortSignal?: AbortSignal }
) => {
  const searchResults = await cachified({
    cache,
    key: `search-context:${query}`,
    ttl: 1000 * 60 * 5,
    getFreshValue: () => _searchRelatedResults(query, abortSignal),
  });
  return { query, searchResults };
};

export type { SearchResultItem };
