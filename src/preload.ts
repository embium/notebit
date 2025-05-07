import { exposeElectronTRPC } from 'electron-trpc/main';
import { contextBridge, ipcRenderer } from 'electron';

process.once('loaded', () => {
  exposeElectronTRPC();

  // Expose APIs for event handling between main and renderer
  contextBridge.exposeInMainWorld('electron', {
    // Event listeners
    on: (channel: string, callback: (...args: any[]) => void) => {
      const newCallback = (_event: Electron.IpcRendererEvent, ...args: any[]) =>
        callback(...args);
      ipcRenderer.on(channel, newCallback);

      return () => {
        ipcRenderer.removeListener(channel, newCallback);
      };
    },

    // One-time event listeners
    once: (channel: string, callback: (...args: any[]) => void) => {
      const newCallback = (_event: Electron.IpcRendererEvent, ...args: any[]) =>
        callback(...args);
      ipcRenderer.once(channel, newCallback);

      return () => {
        ipcRenderer.removeListener(channel, newCallback);
      };
    },
  });
});
