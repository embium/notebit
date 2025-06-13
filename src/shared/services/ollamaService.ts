/**
 * Ollama Service
 *
 * Provides methods for interacting with the Ollama API to manage models.
 */
import { ModelInfo } from '@src/types/ai';
import { parse as parseHTML } from 'node-html-parser';

/**
 * Fetch installed models from Ollama
 */
export async function fetchInstalledModels(
  ollamaHost: string
): Promise<ModelInfo[]> {
  try {
    const apiUrl = normalizeApiHost(ollamaHost);
    const response = await fetch(`${apiUrl}/api/tags`);

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }

    const data = await response.json();
    return data.models.map((model: any) => ({
      id: model.name,
      name: model.name,
      size: formatModelSize(model.size),
      modified: model.modified,
      installed: true,
    }));
  } catch (error) {
    console.error('Error fetching installed models:', error);
    return [];
  }
}

/**
 * Search for models on Ollama's website
 */
export async function searchOllamaModels(
  searchTerm: string = '',
  category?: string,
  sort: 'popular' | 'newest' = 'popular'
): Promise<ModelInfo[]> {
  try {
    let url = 'https://ollama.com/search';
    const params = new URLSearchParams();

    if (searchTerm) {
      params.append('q', searchTerm);
    }

    if (category) {
      params.append('c', category);
    }

    if (sort === 'newest') {
      params.append('o', 'newest');
    }

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to search models: ${response.statusText}`);
    }

    const html = await response.text();
    return parseOllamaSearchResults(html);
  } catch (error) {
    console.error('Error searching Ollama models:', error);
    return [];
  }
}

/**
 * Pull a model from Ollama
 */
export async function pullModel(
  ollamaHost: string,
  modelName: string,
  onProgress?: (progress: number, status: string) => void,
  abortSignal?: AbortSignal
): Promise<{ status: string; progress?: number; message?: string }> {
  try {
    const apiUrl = normalizeApiHost(ollamaHost);

    // Check if already aborted
    if (abortSignal?.aborted) {
      return { status: 'aborted', message: 'Download cancelled' };
    }

    const response = await fetch(`${apiUrl}/api/pull`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: modelName }),
      signal: abortSignal,
    });

    if (!response.ok) {
      throw new Error(`Failed to pull model: ${response.statusText}`);
    }

    // Handle streaming response for progress updates
    if (response.body && onProgress) {
      const reader = response.body.getReader();
      let receivedLength = 0;
      let totalProgress = 0;
      let isAborted = false;

      // Add abort listener
      const abortListener = () => {
        console.log(`Abort signal received for ${modelName}, canceling reader`);
        isAborted = true;
        reader
          .cancel()
          .catch((e) => console.error('Error canceling reader:', e));
      };

      if (abortSignal) {
        abortSignal.addEventListener('abort', abortListener, { once: true });
      }

      try {
        // Process the stream
        while (!isAborted) {
          // Check if aborted before each read
          if (abortSignal?.aborted) {
            console.log(`Detected abort signal for ${modelName}`);
            isAborted = true;
            await reader.cancel();
            break;
          }

          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          receivedLength += value.length;
          const text = new TextDecoder().decode(value);
          const lines = text.split('\n').filter((line) => line.trim());

          for (const line of lines) {
            try {
              const data = JSON.parse(line);

              if (data.status) {
                let progress = totalProgress;
                let status = data.status;

                // Extract progress information
                if (data.completed && data.total) {
                  progress = Math.round((data.completed / data.total) * 100);
                  totalProgress = Math.max(totalProgress, progress);
                  status = `Downloading: ${formatFileSize(data.completed)} of ${formatFileSize(data.total)}`;
                } else if (data.digest) {
                  status = `Processing: ${data.digest.substring(0, 12)}`;
                  progress = 99; // Almost done
                }

                onProgress(progress, status);
              }
            } catch (e) {
              // Ignore parsing errors for non-JSON lines
            }
          }
        }
      } finally {
        // Clean up abort listener
        if (abortSignal) {
          abortSignal.removeEventListener('abort', abortListener);
        }
      }

      if (isAborted) {
        return { status: 'aborted', message: 'Download cancelled' };
      }
    }

    return { status: 'success' };
  } catch (error) {
    // Check if this was an abort error
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.log(`Download aborted for model ${modelName}`);
      return { status: 'aborted', message: 'Download cancelled' };
    }

    console.error(`Error pulling model ${modelName}:`, error);
    return { status: 'error' };
  }
}

/**
 * Delete a model from Ollama
 */
export async function deleteModel(
  ollamaHost: string,
  modelName: string
): Promise<{ status: string }> {
  try {
    const apiUrl = normalizeApiHost(ollamaHost);
    const response = await fetch(`${apiUrl}/api/delete`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: modelName }),
    });

    if (!response.ok) {
      throw new Error(`Failed to delete model: ${response.statusText}`);
    }

    return { status: 'success' };
  } catch (error) {
    console.error(`Error deleting model ${modelName}:`, error);
    return { status: 'error' };
  }
}

/**
 * Parse HTML from Ollama search results
 */
function parseOllamaSearchResults(html: string): ModelInfo[] {
  try {
    const models: ModelInfo[] = [];

    try {
      const root = parseHTML(html);

      // Find all model list items with a reasonable limit
      const modelItems = root.querySelectorAll('li[x-test-model]');
      const MAX_MODELS = 100;

      for (let i = 0; i < Math.min(modelItems.length, MAX_MODELS); i++) {
        try {
          const item = modelItems[i];
          const linkEl = item.querySelector('a[href^="/library/"]');
          if (!linkEl) continue;

          const id =
            linkEl.getAttribute('href')?.replace('/library/', '') || '';
          const nameEl = item.querySelector('[x-test-search-response-title]');
          const descEl = item.querySelector('p');
          const capabilityEl = item.querySelector('[x-test-capability]');
          const pullCountEl = item.querySelector('[x-test-pull-count]');
          const modifiedEl = item.querySelector('[x-test-updated]');

          // Get sizes
          const sizeElements = item.querySelectorAll('[x-test-size]');
          const sizes: string[] = [];
          for (let j = 0; j < Math.min(sizeElements.length, 10); j++) {
            const content = sizeElements[j].textContent;
            if (content) sizes.push(content.trim());
          }

          models.push({
            id: id.trim(),
            name: nameEl?.textContent?.trim() || id,
            description: descEl?.textContent?.trim() || '',
            capability: capabilityEl?.textContent?.trim() || '',
            pullCount: pullCountEl?.textContent?.trim() || '',
            modified: modifiedEl?.textContent?.trim() || '',
            sizes,
            installed: false,
          });
        } catch (elementError) {
          console.error('Error parsing specific model element:', elementError);
        }
      }
    } catch (parserError) {
      console.error('Error with node-html-parser:', parserError);
      throw parserError; // Let the fallback handle it
    }

    return models;
  } catch (error) {
    console.error('Error parsing Ollama search results:', error);
    return [];
  }
}

/**
 * Format model size in human-readable format
 */
function formatModelSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Format file size in human-readable format
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/**
 * Normalize Ollama API host URL
 */
function normalizeApiHost(apiHost: string): string {
  let host = apiHost.trim();
  if (host.endsWith('/')) {
    host = host.slice(0, -1);
  }
  if (host.endsWith('/v1')) {
    host = host.slice(0, -3);
  }
  if (!host.startsWith('http')) {
    host = 'http://' + host;
  }
  if (host === 'http://localhost:11434') {
    host = 'http://127.0.0.1:11434';
  }
  return host;
}
