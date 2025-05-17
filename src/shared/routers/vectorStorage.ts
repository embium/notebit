import { router, publicProcedure } from '@shared/trpc';
import vectorStorageService from '@shared/services/vectorStorageService';
import { z } from 'zod';

/**
 * TRPC Router for vector storage operations
 * Provides a consistent API for vector operations across the application
 */
export const vectorStorageRouter = router({
  /**
   * Store an embedding in the vector database
   */
  store: publicProcedure
    .input(
      z.object({
        id: z.string(),
        collection: z.string(),
        embedding: z.array(z.number()),
        metadata: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        return await vectorStorageService.storeEmbedding(
          input.id,
          input.collection,
          input.embedding,
          input.metadata
        );
      } catch (error) {
        console.error(`Error storing embedding for ${input.id}:`, error);
        throw error;
      }
    }),

  /**
   * Search for similar vectors
   */
  search: publicProcedure
    .input(
      z.object({
        collection: z.string(),
        queryEmbedding: z.array(z.number()),
        limit: z.number().min(1).max(100).optional().default(10),
        ids: z.array(z.string()).optional(),
        similarityThreshold: z.number().min(0).max(1).optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        return await vectorStorageService.searchSimilarVectors(
          input.collection,
          input.queryEmbedding,
          input.limit,
          input.ids,
          input.similarityThreshold
        );
      } catch (error) {
        console.error(
          `Error searching vectors in collection ${input.collection}:`,
          error
        );
        return [];
      }
    }),

  /**
   * Delete vector embeddings by ID
   */
  deleteById: publicProcedure
    .input(
      z.object({
        id: z.string(),
        collection: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        return await vectorStorageService.deleteEmbedding(
          input.id,
          input.collection
        );
      } catch (error) {
        console.error(`Error deleting embedding ${input.id}:`, error);
        return false;
      }
    }),

  /**
   * Delete all vectors in a collection
   */
  deleteByCollection: publicProcedure
    .input(z.string())
    .mutation(async ({ input }) => {
      try {
        return await vectorStorageService.clearCollection(input);
      } catch (error) {
        console.error(`Error clearing collection ${input}:`, error);
        return false;
      }
    }),

  /**
   * Get all document IDs in a collection
   */
  getAllIds: publicProcedure.input(z.string()).query(async ({ input }) => {
    try {
      return await vectorStorageService.getAllDocumentIds(input);
    } catch (error) {
      console.error(
        `Error getting document IDs for collection ${input}:`,
        error
      );
      return [];
    }
  }),

  /**
   * Check if a document is indexed in a collection
   */
  isDocumentIndexed: publicProcedure
    .input(
      z.object({
        id: z.string(),
        collection: z.string(),
      })
    )
    .query(async ({ input }) => {
      try {
        return await vectorStorageService.isDocumentIndexed(
          input.id,
          input.collection
        );
      } catch (error) {
        console.error(
          `Error checking if document ${input.id} is indexed:`,
          error
        );
        return false;
      }
    }),
});
