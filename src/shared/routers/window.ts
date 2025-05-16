import { publicProcedure, router } from '@shared/trpc';
import { observable } from '@trpc/server/observable';
import { BrowserWindow } from 'electron';

export const windowRouter = router({
  closeWindow: publicProcedure.mutation(async ({ ctx }) => {
    if (!ctx.window) return;

    ctx.window.close();
  }),
  minimize: publicProcedure.mutation(async ({ ctx }) => {
    if (!ctx.window) return;
    ctx.window.minimize();
  }),
  maximize: publicProcedure.mutation(({ ctx }) => {
    if (!ctx.window) return;
    const isMaximized = ctx.window.isMaximized();

    if (isMaximized) {
      ctx.window.unmaximize();
    } else {
      ctx.window.maximize();
    }
  }),
  isMaximized: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.window) return false;
    const isMaximized = ctx.window.isMaximized();
    return isMaximized;
  }),
  // Subscribe to window maximize/unmaximize events
  onMaximizeChange: publicProcedure.subscription(({ ctx }) => {
    return observable<boolean>((emit) => {
      if (!ctx.window) {
        emit.next(false);
        return;
      }

      const window = ctx.window;

      // Initial state
      emit.next(window.isMaximized());

      // Event handlers
      const handleMaximize = () => emit.next(true);
      const handleUnmaximize = () => emit.next(false);

      // Set up listeners
      window.on('maximize', handleMaximize);
      window.on('unmaximize', handleUnmaximize);

      // Clean up on unsubscribe
      return () => {
        window.removeListener('maximize', handleMaximize);
        window.removeListener('unmaximize', handleUnmaximize);
      };
    });
  }),
});
