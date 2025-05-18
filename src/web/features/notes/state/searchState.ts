import { observable } from '@legendapp/state';
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

/**
 * Similarity threshold levels for semantic search
 */
export type SimilarityThresholdLevel =
  | 'lowest'
  | 'low'
  | 'medium'
  | 'high'
  | 'highest';

/**
 * Map of similarity threshold levels to actual threshold values
 */
export const SIMILARITY_THRESHOLD_VALUES: Record<
  SimilarityThresholdLevel,
  number
> = {
  lowest: 0.3,
  low: 0.45,
  medium: 0.6,
  high: 0.75,
  highest: 0.85,
};

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

  isIndexing: false,

  shouldAbortIndexing: false,

  // Was on search view before leaving notes tab
  wasOnSearchBeforeLeavingNotes: false,

  // Search mode
  searchMode: 'keyword' as SearchMode,

  // Number of search results to display
  searchResultLimit: 20, // Default to show 20 results

  // Similarity threshold for semantic and hybrid search
  similarityThreshold: 'medium' as SimilarityThresholdLevel,
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
}

/**
 * Request the main process to delete all notes vector data
 * This is used when changing the notes directory or when manually
 * clearing the index
 */
export async function deleteNotesVectorCollection(): Promise<void> {
  try {
    await trpcProxyClient.notes.clearVectorCollection.mutate();
    toast.success('Vector index cleared successfully');
  } catch (error) {
    console.error('Failed to clear vector collection:', error);
    toast.error('Failed to clear vector index');
  }
}

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
 * Set similarity threshold
 */
export function setSimilarityThreshold(
  threshold: SimilarityThresholdLevel
): void {
  searchState$.similarityThreshold.set(threshold);
  // If we have an existing query and we're in semantic or hybrid mode, re-search
  const query = searchState$.query.get();
  const searchMode = searchState$.searchMode.get();
  if (query.trim() && (searchMode === 'semantic' || searchMode === 'hybrid')) {
    searchNotes(query, []);
  }
}

/**
 * Get current similarity threshold value
 */
export function getCurrentSimilarityThresholdValue(): number {
  const thresholdLevel = searchState$.similarityThreshold.get();
  return SIMILARITY_THRESHOLD_VALUES[thresholdLevel];
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
  const similarityThreshold = getCurrentSimilarityThresholdValue();

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
          similarityThreshold,
        });
        break;
      case 'hybrid':
        results = await trpcProxyClient.notes.hybridSearch.query({
          query,
          embedding,
          limit,
          similarityThreshold,
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
