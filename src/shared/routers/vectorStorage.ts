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
      return vectorStorageService.storeEmbedding(
        input.id,
        input.collection,
        input.embedding,
        input.metadata
      );
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
      return vectorStorageService.searchSimilarVectors(
        input.collection,
        input.queryEmbedding,
        input.limit,
        input.ids,
        input.similarityThreshold
      );
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
      return vectorStorageService.deleteEmbedding(input.id, input.collection);
    }),

  /**
   * Delete all vectors in a collection
   */
  deleteByCollection: publicProcedure
    .input(z.string())
    .mutation(async ({ input }) => {
      return vectorStorageService.clearCollection(input);
    }),

  /**
   * Get all document IDs in a collection
   */
  getAllIds: publicProcedure.input(z.string()).query(async ({ input }) => {
    return vectorStorageService.getAllDocumentIds(input);
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
      return vectorStorageService.isDocumentIndexed(input.id, input.collection);
    }),
});
