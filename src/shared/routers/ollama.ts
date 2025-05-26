import { router, publicProcedure } from '@shared/trpc';
import { z } from 'zod';
import { observable } from '@trpc/server/observable';
import {
  fetchInstalledModels,
  searchOllamaModels,
  pullModel,
  deleteModel,
} from '@shared/services/ollamaService';

// Define model progress event type
export interface ModelProgressEvent {
  modelName: string;
  progress: number;
  status: string;
}

// Track active download requests with AbortControllers
const activeDownloads: Record<string, AbortController> = {};

/**
 * Router for Ollama model operations
 * Provides utilities for fetching, searching, pulling, and deleting models
 */
export const ollamaRouter = router({
  /**
   * Fetch installed models from Ollama
   */
  getInstalledModels: publicProcedure
    .input(
      z.object({
        ollamaHost: z.string().default('http://127.0.0.1:11434'),
      })
    )
    .query(async ({ input }) => {
      try {
        return await fetchInstalledModels(input.ollamaHost);
      } catch (error) {
        console.error('Error fetching installed models:', error);
        return [];
      }
    }),

  /**
   * Search for models on Ollama's website
   */
  searchModels: publicProcedure
    .input(
      z.object({
        query: z.string().optional(),
        category: z.enum(['embedding', 'vision', 'tools']).optional(),
        sort: z.enum(['popular', 'newest']).default('popular'),
      })
    )
    .query(async ({ input }) => {
      try {
        return await searchOllamaModels(
          input.query,
          input.category,
          input.sort
        );
      } catch (error) {
        console.error('Error searching models:', error);
        return [];
      }
    }),

  /**
   * Pull a model from Ollama
   */
  pullModel: publicProcedure
    .input(
      z.object({
        ollamaHost: z.string().default('http://127.0.0.1:11434'),
        modelName: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Create an AbortController for this download
        const abortController = new AbortController();
        const downloadId = `${input.ollamaHost}:${input.modelName}`;
        activeDownloads[downloadId] = abortController;

        // Create a callback function that will emit progress events via the event emitter
        const progressCallback = (progress: number, status: string) => {
          ctx.ee.emit('OLLAMA_PULL_PROGRESS', {
            modelName: input.modelName,
            progress,
            status,
          });
        };

        try {
          return await pullModel(
            input.ollamaHost,
            input.modelName,
            progressCallback,
            abortController.signal
          );
        } finally {
          // Clean up the AbortController
          delete activeDownloads[downloadId];
        }
      } catch (error) {
        console.error(`Error pulling model ${input.modelName}:`, error);
        return { status: 'error' };
      }
    }),

  /**
   * Cancel an ongoing model pull
   */
  cancelPullModel: publicProcedure
    .input(
      z.object({
        ollamaHost: z.string().default('http://127.0.0.1:11434'),
        modelName: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const downloadId = `${input.ollamaHost}:${input.modelName}`;
        const abortController = activeDownloads[downloadId];

        if (abortController) {
          // Abort the download
          console.log(`Aborting download for ${input.modelName}`);

          try {
            abortController.abort();
          } catch (abortError) {
            console.error('Error during abort:', abortError);
          }

          // Clean up regardless of abort success
          delete activeDownloads[downloadId];

          // Emit a progress event to update clients
          ctx.ee.emit('OLLAMA_PULL_PROGRESS', {
            modelName: input.modelName,
            progress: 0,
            status: 'Download cancelled',
          });

          return { status: 'success', message: 'Download cancelled' };
        }

        return { status: 'error', message: 'No active download found' };
      } catch (error) {
        console.error(
          `Error cancelling download for ${input.modelName}:`,
          error
        );
        return { status: 'error', message: 'Failed to cancel download' };
      }
    }),

  /**
   * Delete a model from Ollama
   */
  deleteModel: publicProcedure
    .input(
      z.object({
        ollamaHost: z.string().default('http://127.0.0.1:11434'),
        modelName: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        return await deleteModel(input.ollamaHost, input.modelName);
      } catch (error) {
        console.error(`Error deleting model ${input.modelName}:`, error);
        return { status: 'error' };
      }
    }),

  /**
   * Subscribe to model pull progress events
   */
  onPullProgress: publicProcedure.subscription(() => {
    return observable<ModelProgressEvent>((emit) => {
      // Handler for progress events
      const onProgress = (data: ModelProgressEvent) => {
        emit.next(data);
      };

      // Listen for progress events from the event emitter
      const eventEmitter = (global as any).eventEmitter;
      if (eventEmitter) {
        eventEmitter.on('OLLAMA_PULL_PROGRESS', onProgress);

        // Return cleanup function
        return () => {
          eventEmitter.off('OLLAMA_PULL_PROGRESS', onProgress);
        };
      }

      return () => {};
    });
  }),
});
