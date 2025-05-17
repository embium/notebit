import { publicProcedure, router } from '@shared/trpc';
import { observable } from '@trpc/server/observable';
import { BrowserWindow } from 'electron';

/**
 * Router for Electron window control operations
 * Provides window manipulation functionality (close, minimize, maximize)
 * and state observation via subscriptions
 */
export const windowRouter = router({
  /**
   * Closes the current application window
   */
  closeWindow: publicProcedure.mutation(async ({ ctx }) => {
    try {
      if (!ctx.window) {
        throw new Error('Window context not available');
      }
      ctx.window.close();
      return true;
    } catch (error) {
      console.error('Error closing window:', error);
      return false;
    }
  }),

  /**
   * Minimizes the current application window
   */
  minimize: publicProcedure.mutation(async ({ ctx }) => {
    try {
      if (!ctx.window) {
        throw new Error('Window context not available');
      }
      ctx.window.minimize();
      return true;
    } catch (error) {
      console.error('Error minimizing window:', error);
      return false;
    }
  }),

  /**
   * Toggles maximize/restore state of the current application window
   */
  maximize: publicProcedure.mutation(({ ctx }) => {
    try {
      if (!ctx.window) {
        throw new Error('Window context not available');
      }
      const isMaximized = ctx.window.isMaximized();

      if (isMaximized) {
        ctx.window.unmaximize();
      } else {
        ctx.window.maximize();
      }
      return true;
    } catch (error) {
      console.error('Error toggling window maximize state:', error);
      return false;
    }
  }),

  /**
   * Returns whether the current window is maximized
   */
  isMaximized: publicProcedure.query(async ({ ctx }) => {
    try {
      if (!ctx.window) {
        return false;
      }
      return ctx.window.isMaximized();
    } catch (error) {
      console.error('Error checking window maximize state:', error);
      return false;
    }
  }),

  /**
   * Subscribes to window maximize/unmaximize events
   * Emits the current maximized state whenever it changes
   */
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
