import { ipcRenderer } from 'electron';

/**
 * Storage-related APIs exposed to the renderer process
 */
export const storageApi = {
  /**
   * Get a value from storage
   */
  get: (key: string) => ipcRenderer.invoke('storage:get', key),

  /**
   * Set a value in storage
   */
  set: (key: string, value: any) =>
    ipcRenderer.invoke('storage:set', key, value),

  /**
   * Delete a value from storage
   */
  delete: (key: string) => ipcRenderer.invoke('storage:delete', key),

  /**
   * Clear all storage
   */
  clear: () => ipcRenderer.invoke('storage:clear'),

  /**
   * Get all keys from storage
   */
  keys: () => ipcRenderer.invoke('storage:keys'),

  /**
   * Check if a key exists in storage
   */
  has: (key: string) => ipcRenderer.invoke('storage:has', key),

  /**
   * Get the size of storage
   */
  size: () => ipcRenderer.invoke('storage:size'),

  /**
   * Get all storage data
   */
  getAll: () => ipcRenderer.invoke('storage:getAll'),

  /**
   * Set multiple values at once
   */
  setMany: (items: Record<string, any>) =>
    ipcRenderer.invoke('storage:setMany', items),

  /**
   * Delete multiple keys at once
   */
  deleteMany: (keys: string[]) =>
    ipcRenderer.invoke('storage:deleteMany', keys),
};
