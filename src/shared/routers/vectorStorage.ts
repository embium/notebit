import { router, publicProcedure } from '@shared/trpc';
import vectorStorageService from '@shared/services/vectorStorageService';
import { z } from 'zod';

/**
 * TRPC Router for vector storage operations
 * Uses LanceDB for high-performance vector similarity search
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
      // Use the vector storage service
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
        filters: z.record(z.any()).optional(), // For future use with LanceDB filtering
      })
    )
    .query(async ({ input }) => {
      return vectorStorageService.searchSimilarVectors(
        input.collection,
        input.queryEmbedding,
        input.limit
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
});
