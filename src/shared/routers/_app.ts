import { router, publicProcedure } from '@shared/trpc';
import pkg from '../../../package.json';
import { windowRouter } from '@shared/routers/window';
import { storageRouter } from '@shared/routers/storage';
import { notesRouter } from './notes';
import { fileAttachmentsRouter } from './fileAttachments';
import { smartHubsRouter } from './smartHubs';
import { vectorStorageRouter } from './vectorStorage';

// Create a completely new app router for the main process
// to avoid duplicate keys
export const mainAppRouter = router({
  window: windowRouter,
  getVersion: publicProcedure.query(() => {
    return pkg.version;
  }),
  store: storageRouter,
  notes: notesRouter,
  fileAttachments: fileAttachmentsRouter,
  smartHubs: smartHubsRouter,
  vectorStorage: vectorStorageRouter,
});

// Export type router type
export type AppRouter = typeof mainAppRouter;
