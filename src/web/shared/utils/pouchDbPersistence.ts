import { persistObservable } from '@legendapp/state/persist';
import { debounce } from './debounce';
import { chatStateTransform, safeSerialize } from './stateTransforms';
import { trpcProxyClient } from '@shared/config';
// Import all state observables
import { chatsState$ } from '@/features/chats/state/chatsState';
import { smartHubsState$ } from '@/features/smart-hubs/state/smartHubsState';
import { defaultPromptsState$ } from '@/features/settings/state/defaultPromptsState';
import { generalSettingsState$ } from '@/features/settings/state/generalSettingsState';
import { layoutSettingsState$ } from '@/features/settings/state/layoutSettingsState';
import { promptsLibraryState$ } from '@/features/prompts-library/state/promptsLibraryState';
import {
  aiMemorySettings$,
  aiSettingsState$,
} from '@src/web/features/settings/state/aiSettings/aiSettingsState';

// Cache for document revisions to handle update conflicts
const documentRevisions: Record<string, string> = {};

// Debounce timers for each state
const debouncedSaves: Record<string, ReturnType<typeof setTimeout>> = {};

// Queue system for sequential updates
interface QueueItem {
  key: string;
  value: any;
  resolve: (value: void | PromiseLike<void>) => void;
  reject: (reason?: any) => void;
}

const saveQueue: QueueItem[] = [];
let isProcessingQueue = false;

/**
 * Initialize PouchDB persistence for all application state
 * This ensures all state is stored in both localStorage and PouchDB
 */
export async function initializePouchDbPersistence(): Promise<void> {
  console.log('Initializing PouchDB persistence for all state...');

  // First, try to load data from PouchDB for each state
  await loadStateFromPouchDb();

  // Set up persistence for chats state with transform to handle files
  persistObservable(chatsState$, {
    local: {
      name: 'chats-state',
      transform: {
        out: chatStateTransform,
        in: (value: any) => value,
      },
    },
  });

  // Also save to PouchDB when chats state changes
  chatsState$.onChange((value) => {
    try {
      const transformedValue = chatStateTransform(value);
      queueSaveOperation('chats-state', transformedValue);
    } catch (error) {
      console.error('Error transforming chats state for PouchDB:', error);
    }
  });

  // Set up persistence for other state observables with safe serialization
  // Use more aggressive debouncing for states that might change frequently
  setupStatePersistence(smartHubsState$, 'smart-hubs-state');
  setupStatePersistence(defaultPromptsState$, 'default-prompts-state');
  setupStatePersistence(generalSettingsState$, 'general-settings-state');
  setupStatePersistence(layoutSettingsState$, 'layout-settings-state');
  setupStatePersistence(promptsLibraryState$, 'prompts-library-state');
  setupStatePersistence(aiSettingsState$, 'ai-settings-state');
  setupStatePersistence(aiMemorySettings$, 'ai-memory-settings-state');

  // Force load the latest revisions to ensure we have them
  await preloadAllRevisions();

  console.log('PouchDB persistence initialized for all state');
}

/**
 * Preload all document revisions to ensure we have the latest
 */
async function preloadAllRevisions(): Promise<void> {
  try {
    console.log('Preloading document revisions...');

    const keys = [
      'chats-state',
      'smart-hubs-state',
      'default-prompts-state',
      'general-settings-state',
      'layout-settings-state',
      'prompts-library-state',
    ];

    for (const key of keys) {
      const docId = `legend_state_${key}`;
      try {
        const doc = await trpcProxyClient.store.getData.query({ id: docId });
        if (doc && '_rev' in doc) {
          documentRevisions[docId] = doc._rev as string;
          console.log(`Loaded revision for ${docId}: ${doc._rev}`);
        }
      } catch (error) {
        console.log(
          `No existing document found for ${docId}, will be created on first save`
        );
      }
    }
  } catch (error) {
    console.error('Error preloading revisions:', error);
  }
}

/**
 * Set up persistence for a state observable with safe serialization
 *
 * @param stateObservable The state observable to persist
 * @param storageKey The key to use for storage
 * @param debounceMs Debounce time in milliseconds
 */
function setupStatePersistence(
  stateObservable: any,
  storageKey: string,
  debounceMs = 1000
): void {
  // Set up Legend State persistence for localStorage
  persistObservable(stateObservable, {
    local: storageKey,
  });

  // Set up PouchDB persistence with safe serialization and debouncing
  stateObservable.onChange((value: any) => {
    try {
      // Clear any existing debounce timer
      if (debouncedSaves[storageKey]) {
        clearTimeout(debouncedSaves[storageKey]);
      }

      // Create a new debounce timer
      debouncedSaves[storageKey] = setTimeout(() => {
        try {
          // Safely serialize the value before saving to PouchDB
          const safeValue = safeSerialize(value);
          console.log(`Queueing save for ${storageKey} to PouchDB...`);
          queueSaveOperation(storageKey, safeValue);
        } catch (error) {
          console.error(`Error serializing ${storageKey} for PouchDB:`, error);
        }
      }, debounceMs);
    } catch (error) {
      console.error(`Error setting up onChange for ${storageKey}:`, error);
    }
  });

  // Log to confirm setup
  console.log(`Set up PouchDB persistence for ${storageKey}`);
}

/**
 * Queue a save operation to ensure sequential processing
 *
 * @param key The storage key
 * @param value The value to save
 * @returns Promise that resolves when the save is complete
 */
function queueSaveOperation(key: string, value: any): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    // Add to queue
    saveQueue.push({ key, value, resolve, reject });

    // Start processing if not already in progress
    if (!isProcessingQueue) {
      processQueue();
    }
  });
}

/**
 * Process the save queue sequentially
 */
async function processQueue(): Promise<void> {
  if (saveQueue.length === 0) {
    isProcessingQueue = false;
    return;
  }

  isProcessingQueue = true;
  const { key, value, resolve, reject } = saveQueue.shift()!;

  try {
    console.log(`Processing queue item: ${key}`);
    await saveStateToPouchDb(key, value);
    resolve();
  } catch (error) {
    console.error(`Error processing queue item for ${key}:`, error);
    reject(error);
  } finally {
    // Process next item in queue
    setTimeout(() => {
      processQueue();
    }, 100); // Small delay between operations
  }
}

/**
 * Save state to PouchDB with proper revision handling
 *
 * @param key The storage key
 * @param value The value to save
 */
async function saveStateToPouchDb(key: string, value: any): Promise<void> {
  const docId = `legend_state_${key}`;

  // Log the current revision we have
  console.log(
    `Saving ${docId} with revision: ${documentRevisions[docId] || 'none'}`
  );

  try {
    // Always get the latest document first to ensure we have the current revision
    let currentRevision: string | undefined;

    try {
      const currentDoc = await trpcProxyClient.store.getData.query({
        id: docId,
      });
      if (currentDoc && '_rev' in currentDoc) {
        currentRevision = currentDoc._rev as string;
        documentRevisions[docId] = currentRevision;
        console.log(`Got latest revision for ${docId}: ${currentRevision}`);
      }
    } catch (error) {
      console.log(`Document ${docId} doesn't exist yet, will create new`);
    }

    if (currentRevision) {
      // Update existing document with current revision
      const result = await trpcProxyClient.store.saveData.mutate({
        id: docId,
        data: {
          _rev: currentRevision,
          value,
        },
      });

      // Update the revision for next time
      if (result && '_rev' in result) {
        documentRevisions[docId] = result._rev as string;
        console.log(`Updated revision for ${docId}: ${result._rev}`);
      }
    } else {
      // Create new document
      const result = await trpcProxyClient.store.saveData.mutate({
        id: docId,
        data: { value },
      });

      // Store the new revision
      if (result && '_rev' in result) {
        documentRevisions[docId] = result._rev as string;
        console.log(
          `Created document for ${docId} with revision: ${result._rev}`
        );
      }
    }
  } catch (error: any) {
    // Check if it's a conflict error
    if (error.message && error.message.includes('conflict')) {
      console.warn(
        `Document conflict for ${docId}, fetching latest revision and retrying...`
      );

      try {
        // Get the latest document with its current revision
        const latestDoc = await trpcProxyClient.store.getData.query({
          id: docId,
        });

        if (latestDoc && '_rev' in latestDoc) {
          // Update our cached revision
          const latestRevision = latestDoc._rev as string;
          documentRevisions[docId] = latestRevision;
          console.log(
            `Updated revision after conflict for ${docId}: ${latestRevision}`
          );

          // Retry the save with the latest revision
          const result = await trpcProxyClient.store.saveData.mutate({
            id: docId,
            data: {
              _rev: latestRevision,
              value,
            },
          });

          // Update the revision for next time
          if (result && '_rev' in result) {
            documentRevisions[docId] = result._rev as string;
            console.log(
              `Updated revision after retry for ${docId}: ${result._rev}`
            );
          }
        }
      } catch (retryError) {
        console.error(`Failed to resolve conflict for ${docId}:`, retryError);
        throw retryError; // Re-throw to signal failure to the queue
      }
    } else {
      console.error(`Error saving ${key} to PouchDB:`, error);
      throw error; // Re-throw to signal failure to the queue
    }
  }
}

/**
 * Load state from PouchDB for all state observables
 * This is called during initialization to ensure we have the latest data
 */
async function loadStateFromPouchDb(): Promise<void> {
  try {
    console.log('Loading state from PouchDB...');

    // Load chats state
    await loadStateData(chatsState$, 'chats-state');

    // Load smart hubs state
    await loadStateData(smartHubsState$, 'smart-hubs-state');

    // Load default prompts state
    await loadStateData(defaultPromptsState$, 'default-prompts-state');

    // Load general settings state
    await loadStateData(generalSettingsState$, 'general-settings-state');

    // Load layout settings state
    await loadStateData(layoutSettingsState$, 'layout-settings-state');

    // Load prompts library state
    await loadStateData(promptsLibraryState$, 'prompts-library-state');

    console.log('Finished loading state from PouchDB');
  } catch (error) {
    console.error('Error loading state from PouchDB:', error);
  }
}

/**
 * Helper function to load state data from PouchDB
 *
 * @param stateObservable The state observable to update
 * @param storageKey The key to use for storage
 */
async function loadStateData(
  stateObservable: any,
  storageKey: string
): Promise<void> {
  const docId = `legend_state_${storageKey}`;

  try {
    console.log(`Loading ${storageKey} from PouchDB...`);
    // Use trpcProxyClient directly to get the document with its revision
    const data = await trpcProxyClient.store.getData.query({ id: docId });

    if (data) {
      // Store the revision for future updates
      if ('_rev' in data) {
        documentRevisions[docId] = data._rev as string;
        console.log(`Loaded revision for ${docId}: ${data._rev}`);
      }

      // Update the state if the document has a value
      if ('value' in data) {
        console.log(`Found ${storageKey} in PouchDB, updating state...`);
        // Normalize the data before setting it
        const normalizedValue = normalizeStateData(data.value);
        console.log(`Normalized data for ${storageKey}:`, normalizedValue);

        // Validate the data before setting it
        if (normalizedValue && typeof normalizedValue === 'object') {
          stateObservable.set(normalizedValue);
        } else {
          console.warn(
            `Invalid data format for ${storageKey}, not updating state`
          );
        }
      }
    }
  } catch (error) {
    console.log(`No data found for ${storageKey} in PouchDB or error loading`);
    console.error(`Error loading ${storageKey} from PouchDB:`, error);
  }
}

/**
 * Normalize state data by unwrapping nested value objects
 * This handles the case where the data has been wrapped in multiple value objects
 *
 * @param data The data to normalize
 * @returns Normalized data object
 */
function normalizeStateData(data: any): any {
  // If the data is null or not an object, return as is
  if (!data || typeof data !== 'object') {
    return data;
  }

  // If the data has a value property and it's an object, recursively unwrap it
  if ('value' in data && typeof data.value === 'object') {
    return normalizeStateData(data.value);
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map((item) => normalizeStateData(item));
  }

  // For regular objects, normalize each property
  const result: Record<string, any> = {};
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key) && key !== 'changes') {
      result[key] = normalizeStateData(data[key]);
    }
  }

  return result;
}

/**
 * Create a persistence configuration for both local storage and PouchDB
 * This helps prevent excessive database operations by batching updates
 *
 * @param key The unique key for this state in storage
 * @param debounceMs Debounce time in milliseconds (default: 500ms)
 */
export function createPouchDbPersistence(key: string, debounceMs = 500) {
  // Create a debounced save function to prevent excessive writes
  const debouncedSave = debounce(async (value: any) => {
    try {
      // Safely serialize the value before saving
      const safeValue = safeSerialize(value);
      await queueSaveOperation(key, safeValue);
    } catch (error) {
      console.error(`Error saving state to PouchDB (${key}):`, error);
    }
  }, debounceMs);

  return {
    // Save to local storage
    local: key,
    // Custom handler for PouchDB persistence
    custom: {
      // Save to PouchDB with debouncing
      save: (value: any) => {
        debouncedSave(value);
      },
      // Load from PouchDB
      load: async () => {
        try {
          const docId = `legend_state_${key}`;
          const result = await trpcProxyClient.store.getData.query({
            id: docId,
          });

          // Store the revision for future updates
          if (result && '_rev' in result) {
            documentRevisions[docId] = result._rev as string;
            console.log(
              `Loaded revision in custom loader for ${docId}: ${result._rev}`
            );
          }

          // Return the value if it exists
          return result && 'value' in result ? result.value : null;
        } catch (error) {
          console.error(`Error loading state from PouchDB (${key}):`, error);
          return null;
        }
      },
    },
  };
}
