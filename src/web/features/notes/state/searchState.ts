import { observable } from '@legendapp/state';
import { persistObservable } from '@legendapp/state/persist';
import { toast } from 'sonner';
import { useEffect, useRef } from 'react';

// TRPC
import { trpcProxyClient } from '@shared/config';

// Utils
import { generateEmbedding } from '@/shared/ai/embeddingUtils';
import { generalSettingsState$ } from '@/features/settings/state/generalSettingsState';

/**
 * Search result item interface
 */
export interface SearchResultItem {
  id: string;
  title: string;
  path: string;
  preview?: string;
  score: number;
}

/**
 * Search mode type
 */
export type SearchMode = 'keyword' | 'semantic' | 'hybrid';

// Log initial setup
console.log('Initializing search state');

/**
 * Search state
 */
export const searchState$ = observable({
  // Search query
  query: '',

  // Search results
  results: [] as SearchResultItem[],

  // Loading state
  isSearching: false,

  // Is search view active
  isSearchActive: false,

  // Was on search view before leaving notes tab
  wasOnSearchBeforeLeavingNotes: false,

  // Search mode
  searchMode: 'keyword' as SearchMode,

  // Number of search results to display
  searchResultLimit: 20, // Default to show 20 results

  // Index abort controller - to abort indexing when directory changes
  shouldAbortIndexing: false,
});

// Log initial state for debugging
console.log('Initial search state:', {
  isSearchActive: searchState$.isSearchActive.get(),
});

// Create a reference to store the previous directory
let previousNotesDirectory = generalSettingsState$.notesDirectory.get();

// Subscribe to changes in the notes directory
generalSettingsState$.notesDirectory.onChange((newDirectoryValue) => {
  // Get the string value from the event
  const newDirectory = String(newDirectoryValue);

  // Skip if it's the initial value or same as previous
  if (newDirectory === previousNotesDirectory) return;

  console.log(
    'Notes directory changed from',
    previousNotesDirectory,
    'to',
    newDirectory
  );

  // If we're currently indexing, abort the indexing process
  if (searchState$.isSearching.get()) {
    console.log('Aborting in-progress indexing due to directory change');
    searchState$.shouldAbortIndexing.set(true);
    toast.info('Aborting current indexing due to directory change...');
  }

  // Update the previous directory reference
  previousNotesDirectory = newDirectory;
});

/**
 * Initialize the search system
 */
export function initializeSearch(): void {
  console.log('Initializing search system');

  // Only clear results and query if needed, but preserve isSearchActive state
  if (!searchState$.isSearchActive.get()) {
    // Clear any previous results if not in search mode
    searchState$.query.set('');
    searchState$.results.set([]);
  }

  // Always reset the searching state flag
  searchState$.isSearching.set(false);

  // Reset the abort flag
  searchState$.shouldAbortIndexing.set(false);
}

/**
 * Index notes for vector search
 */
export async function indexNotesForVectorSearch(): Promise<void> {
  // Safety timeout - ensure we reset isSearching state after 5 minutes max
  // This prevents the UI from getting stuck in a searching state
  const safetyTimeout = setTimeout(
    () => {
      console.log('Safety timeout reached - forcing indexing to complete');
      searchState$.shouldAbortIndexing.set(false);
      searchState$.isSearching.set(false);
      toast.error('Indexing timed out. You can try again later.');
    },
    5 * 60 * 1000
  ); // 5 minutes timeout

  try {
    // Reset the abort flag before starting
    searchState$.shouldAbortIndexing.set(false);

    console.log('Starting vector indexing process...');
    searchState$.isSearching.set(true);

    // First, check which notes need indexing (this doesn't generate embeddings)
    const { needsIndexing, alreadyIndexed, total } =
      await trpcProxyClient.notes.getNotesNeedingIndexing.query();

    console.log(`Indexing status check complete: ${total} total notes`);
    console.log(`- ${alreadyIndexed.length} notes are already indexed`);
    console.log(`- ${needsIndexing.length} notes need indexing`);

    // If no notes need indexing, we're done
    if (needsIndexing.length === 0) {
      return Promise.resolve();
    }

    // Show progress toast
    toast.info(`Indexing ${needsIndexing.length} notes...`);

    // Concurrency control parameters
    const batchSize = 3; // Process 3 notes at a time
    const delayBetweenBatches = 300; // Add 300ms delay between batches to reduce UI lag
    const totalNotes = needsIndexing.length;
    let successCount = 0;
    let errorCount = 0;

    // Helper function to introduce a delay
    const sleep = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    // Process notes in batches to control concurrency
    for (let i = 0; i < totalNotes; i += batchSize) {
      // Check if we should abort due to directory change
      if (searchState$.shouldAbortIndexing.get()) {
        console.log('Indexing aborted due to directory change');
        toast.info('Indexing aborted due to directory change');
        return Promise.resolve();
      }

      const batch = needsIndexing.slice(i, i + batchSize);
      console.log(
        `Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(totalNotes / batchSize)}, size: ${batch.length}`
      );

      // Update status immediately before processing to keep UI responsive
      const progressPercent = Math.round((i / totalNotes) * 100);
      searchState$.isSearching.set(true); // Ensure the UI shows we're still searching

      // Process each batch concurrently
      const batchResults = await Promise.allSettled(
        batch.map(async (note) => {
          // Check for abort before starting each note
          if (searchState$.shouldAbortIndexing.get()) {
            return { success: false, noteId: note.id, reason: 'aborted' };
          }

          try {
            // Get the note content for embedding
            const content = await trpcProxyClient.notes.getContent.query(
              note.path
            );

            // Check for abort after getting content
            if (searchState$.shouldAbortIndexing.get()) {
              return { success: false, noteId: note.id, reason: 'aborted' };
            }

            // Skip if no content
            if (!content || content.trim().length === 0) {
              console.log(`Skipping note ${note.id} - no content`);
              return {
                success: false,
                noteId: note.id,
                reason: 'empty-content',
              };
            }

            // Generate embedding in the renderer process (where the AI model is accessible)
            const embedding = await generateEmbedding(content);

            // Check for abort after generating embedding
            if (searchState$.shouldAbortIndexing.get()) {
              return { success: false, noteId: note.id, reason: 'aborted' };
            }

            if (!embedding) {
              console.warn(`Couldn't generate embedding for ${note.id}`);
              return {
                success: false,
                noteId: note.id,
                reason: 'embedding-failed',
              };
            }

            // Send the embedding to the main process for storage
            await trpcProxyClient.notes.indexNote.mutate({
              noteId: note.id,
              embedding,
            });

            return { success: true, noteId: note.id };
          } catch (error) {
            console.error(`Error indexing note ${note.id}:`, error);
            return { success: false, noteId: note.id, error };
          }
        })
      );

      // Count results from this batch, don't count aborted ones
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          if (result.value.success) {
            successCount++;
            console.log(
              `Indexed note ${successCount}/${totalNotes}: ${result.value.noteId}`
            );
          } else if (result.value.reason !== 'aborted') {
            errorCount++;
          }
        } else {
          errorCount++;
        }
      });

      // Check if we should abort after processing the batch
      if (searchState$.shouldAbortIndexing.get()) {
        console.log('Indexing aborted after batch due to directory change');
        toast.info('Indexing aborted due to directory change');
        return Promise.resolve();
      }

      // Provide progress updates for large batches
      if (
        (totalNotes > 10 && (i + batchSize) % 10 === 0) ||
        i + batchSize >= totalNotes
      ) {
        const processed = Math.min(i + batchSize, totalNotes);
        toast.info(
          `Indexing progress: ${processed}/${totalNotes} notes (${Math.round((processed / totalNotes) * 100)}%)`
        );
      }

      // Add a delay between batches to prevent UI thread exhaustion
      // Skip the delay for the last batch
      if (i + batchSize < totalNotes) {
        await sleep(delayBetweenBatches);
      }
    }

    // Report results only if not aborted
    if (!searchState$.shouldAbortIndexing.get()) {
      if (successCount > 0) {
        toast.success(`Successfully indexed ${successCount} notes`);
      }

      if (errorCount > 0) {
        toast.error(`Failed to index ${errorCount} notes`);
      }
    }

    return Promise.resolve();
  } catch (error) {
    console.error('Failed to index notes for vector search:', error);
    toast.error('Failed to index notes for vector search');
    return Promise.reject(error);
  } finally {
    // Clear the safety timeout
    clearTimeout(safetyTimeout);

    // Reset abort flag and searching state
    searchState$.shouldAbortIndexing.set(false);
    searchState$.isSearching.set(false);
  }
}

export async function deleteNotesVectorCollection(): Promise<void> {
  // Abort any in-progress indexing
  if (searchState$.isSearching.get()) {
    searchState$.shouldAbortIndexing.set(true);
    // Small delay to ensure the indexing process has time to abort properly
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  await trpcProxyClient.notes.clearVectorCollection.mutate();

  // Restart indexing with the new directory
  // We do this on a small delay to ensure the abort has completed
  setTimeout(() => {
    indexNotesForVectorSearch();
  }, 300);
}

/**
 * Persist search settings
 * Note: We intentionally don't persist search state between app sessions
 * so that users always start with the default notes list view
 */
// persistObservable(searchState$, {
//   local: 'notes-search-state',
// });

/**
 * Set search active state
 */
export function setSearchActive(isActive: boolean): void {
  // Log for debugging
  console.log('Setting search active state:', isActive);
  searchState$.isSearchActive.set(isActive);

  // Also update the tracking state if we're setting search active
  if (isActive) {
    searchState$.wasOnSearchBeforeLeavingNotes.set(true);
    // Clear any existing results when activating search tab
    searchState$.results.set([]);
  } else {
    // Reset the tracking state when explicitly leaving search mode
    searchState$.wasOnSearchBeforeLeavingNotes.set(false);
  }
}

/**
 * Toggle search active state
 */
export function toggleSearchActive(): void {
  const currentState = searchState$.isSearchActive.get();
  const newState = !currentState;
  // Log for debugging
  console.log('Toggling search active state:', currentState, '->', newState);
  searchState$.isSearchActive.set(newState);
}

/**
 * Set search query
 */
export function setSearchQuery(query: string): void {
  searchState$.query.set(query);
}

/**
 * Set search mode
 */
export function setSearchMode(mode: SearchMode): void {
  searchState$.searchMode.set(mode);
  // If we have an existing query, re-search with the new mode
  const query = searchState$.query.get();
  if (query.trim()) {
    searchNotes(query, []);
  }
}

/**
 * Search notes
 */
export async function searchNotes(
  query: string = searchState$.query.get(),
  embedding: number[]
): Promise<void> {
  // If no query, clear results and return
  if (!query.trim()) {
    searchState$.results.set([]);
    return;
  }

  searchState$.isSearching.set(true);
  const searchMode = searchState$.searchMode.get();
  const limit = searchState$.searchResultLimit.get();

  try {
    let results: SearchResultItem[] = [];

    switch (searchMode) {
      case 'keyword':
        results = await trpcProxyClient.notes.searchNotes.query({
          query,
          limit,
        });
        break;
      case 'semantic':
        results = await trpcProxyClient.notes.semanticSearch.query({
          query,
          embedding,
          limit,
        });
        break;
      case 'hybrid':
        results = await trpcProxyClient.notes.hybridSearch.query({
          query,
          embedding,
          limit,
        });
        break;
    }

    // Ensure we have valid preview and score fields
    const sanitizedResults = results.map((result) => ({
      ...result,
      preview: result.preview || 'No preview available',
      score: result.score || 0,
    }));

    searchState$.results.set(sanitizedResults);
  } catch (error) {
    console.error(`Error searching notes (${searchMode}):`, error);
    toast.error(`Error searching notes (${searchMode})`);
    // Set empty results instead of leaving previous results
    searchState$.results.set([]);
  } finally {
    searchState$.isSearching.set(false);
  }
}

/**
 * Clear search results
 */
export function clearSearchResults(): void {
  // Clear query and results
  searchState$.query.set('');
  searchState$.results.set([]);
  searchState$.isSearching.set(false);
}

/**
 * Set search result limit
 */
export function setSearchResultLimit(limit: number): void {
  if (limit < 1) limit = 1;
  if (limit > 100) limit = 100; // Cap at 100 to prevent performance issues
  searchState$.searchResultLimit.set(limit);

  // If we have an existing query, re-search with the new limit
  const query = searchState$.query.get();
  if (query.trim()) {
    // Re-run the search with the current query
    generateEmbedding(query).then((embedding) => {
      if (embedding) {
        searchNotes(query, embedding);
      }
    });
  }
}

/**
 * Handle tab changes in the application
 * This should be called when the active tab changes
 */
export function handleTabChange(newTab: string): void {
  // If we're leaving the notes tab, record if search was active
  if (newTab !== 'notes') {
    const currentSearchActive = searchState$.isSearchActive.get();
    searchState$.wasOnSearchBeforeLeavingNotes.set(currentSearchActive);
  }
}

/**
 * Reset search state to defaults
 * This should be called during app initialization to ensure search always starts inactive
 */
export function resetSearchStateDefaults(): void {
  console.log('Resetting search state to defaults on app start');
  searchState$.isSearchActive.set(false);
  searchState$.wasOnSearchBeforeLeavingNotes.set(false);
  searchState$.query.set('');
  searchState$.results.set([]);
  searchState$.isSearching.set(false);
}
