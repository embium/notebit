import { publicProcedure, router } from '@shared/trpc';
import { z } from 'zod';

export const storageRouter = router({
  getData: publicProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const result = await ctx.store.get(input.id);
      return result;
    }),

  saveData: publicProcedure
    .input(
      z.object({
        id: z.string(),
        data: z.any(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.store.put({
        _id: input.id,
        ...input.data,
      });
      return result;
    }),
});
