import { publicProcedure, router } from '@shared/trpc';
import { z } from 'zod';

/**
 * Router for PouchDB-based document storage operations
 * Provides basic get/save functionality for application data
 */
export const storageRouter = router({
  /**
   * Retrieves a document from the PouchDB store by ID
   */
  getData: publicProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        if (!ctx.store) {
          throw new Error('Storage context not available');
        }
        const result = await ctx.store.get(input.id);
        return result;
      } catch (error) {
        return null;
      }
    }),

  /**
   * Saves a document to the PouchDB store
   */
  saveData: publicProcedure
    .input(
      z.object({
        id: z.string(),
        data: z.any(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        if (!ctx.store) {
          throw new Error('Storage context not available');
        }
        const result = await ctx.store.put({
          _id: input.id,
          ...input.data,
        });
        return result;
      } catch (error) {
        console.error(`Error saving data for ID ${input.id}:`, error);
        throw error;
      }
    }),
});
