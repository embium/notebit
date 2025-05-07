import { observable, computed } from '@legendapp/state';
import { persistObservable } from '@legendapp/state/persist';
import { trpcProxyClient } from '@shared/config';
import { toast } from 'sonner';
import {
  searchState$,
  deleteNotesVectorCollection,
} from '@/features/notes/state/searchState';

// Types
import { GeneralSettingsState } from '@src/shared/types/settings';

// Create the initial state
const initialState: GeneralSettingsState = {
  enableLinks: true,
  shouldGenerateChatTitles: true,
  notesDirectory: '',
};

/**
 * Observable state for the Settings feature
 */
export const generalSettingsState$ =
  observable<GeneralSettingsState>(initialState);

/**
 * Setup persistence for settings state
 */
persistObservable(generalSettingsState$, {
  local: 'general-settings-state',
});

// Computed selectors
export const notesDirectory = computed(() =>
  generalSettingsState$.notesDirectory.get()
);

// Action functions for settings operations
export async function fetchNotesDirectory(): Promise<void> {
  try {
    const dir = await trpcProxyClient.notes.getNotesDirectory.query();
    generalSettingsState$.notesDirectory.set(dir);
  } catch (error) {
    console.error('Error fetching notes directory:', error);
  }
}

export async function setNotesDirectory(dir: string): Promise<void> {
  try {
    // First, delete the vector collection (this will abort any in-progress indexing)
    try {
      await deleteNotesVectorCollection();
    } catch (error) {
      console.error('Error deleting vector collection:', error);
      // Continue anyway - we still want to update the directory
    }

    // Then update the directory in the TRPC main process
    await trpcProxyClient.notes.setNotesDirectory.mutate(dir);

    // Finally, update our local state which will trigger the directory change handler
    generalSettingsState$.notesDirectory.set(dir);

    toast.success('Notes directory updated successfully');
  } catch (error) {
    console.error('Error setting notes directory:', error);
    // Force reset the search state in case it's stuck
    searchState$.isSearching.set(false);
    searchState$.shouldAbortIndexing.set(false);

    toast.error('Failed to update notes directory');
    throw error; // Re-throw to allow the UI to handle the error
  }
}

export async function pickNotesDirectory(): Promise<string | null> {
  return await trpcProxyClient.notes.pickNotesDirectory.mutate();
}

// Initialize settings - can be called at app startup
export async function initializeSettings(): Promise<void> {
  await fetchNotesDirectory();
}
