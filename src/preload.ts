import { exposeElectronTRPC } from 'electron-trpc/main';

process.once('loaded', () => {
  // Use electron-trpc for type-safe IPC communication between main and renderer processes
  exposeElectronTRPC();
});
