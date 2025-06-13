import { NoteSearchResult } from '@src/types/notes';
import {
  getAllNotes as getFileNotes,
  getNoteContent,
} from './notesFileService';
import vectorStorageService from './vectorStorageService';

// Define interface for our internal result before converting to NoteSearchResult
interface NoteSimilarityResult {
  id: string;
  title: string;
  path: string;
  preview: string;
  similarity: number;
}

/**
 * The collection name used for notes in the vector database
 */
const NOTES_COLLECTION = 'notes';

// Add a cache for indexed note IDs to avoid repeated database lookups
let cachedIndexedNotes: string[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 60000; // 1 minute cache lifetime

/**
 * Check if notes have been indexed
 */
export async function isNotesIndexed(): Promise<boolean> {
  try {
    // Check if there are any notes in the collection
    const indexedNoteIds =
      await vectorStorageService.getAllDocumentIds(NOTES_COLLECTION);
    return indexedNoteIds.length > 0;
  } catch (error) {
    console.error('Error checking if notes are indexed:', error);
    return false;
  }
}

/**
 * Get all notes that have been indexed
 */
export async function getIndexedNotes(): Promise<string[]> {
  try {
    // Check if we have a valid cache
    const now = Date.now();
    if (cachedIndexedNotes && now - cacheTimestamp < CACHE_TTL) {
      return cachedIndexedNotes;
    }

    // Use the getAllDocumentIds method
    const indexedIds =
      await vectorStorageService.getAllDocumentIds(NOTES_COLLECTION);

    // Update cache
    cachedIndexedNotes = indexedIds;
    cacheTimestamp = now;

    return indexedIds;
  } catch (error) {
    console.error('Error getting indexed notes:', error);
    return [];
  }
}

/**
 * Invalidate the cached list of indexed notes
 * This should be called whenever notes are indexed or deleted
 */
export function invalidateIndexCache(): void {
  cachedIndexedNotes = null;
  cacheTimestamp = 0;
}

/**
 * Check if a note is already indexed
 */
export async function checkIsNoteIndexed(noteId: string): Promise<boolean> {
  try {
    // Normalize the ID for comparison
    const normalizedId = normalizeNoteId(noteId);

    // Use the vectorStorageService to check if the document is indexed
    return await vectorStorageService.isDocumentIndexed(
      normalizedId,
      NOTES_COLLECTION
    );
  } catch (error) {
    console.error(`Error checking if note ${noteId} is indexed:`, error);
    return false;
  }
}

/**
 * Index all notes for vector search
 */
export async function indexNote(
  noteId: string,
  embedding: number[],
  forceReindex: boolean = false
): Promise<boolean> {
  try {
    // Normalize the ID to ensure consistency
    const normalizedId = normalizeNoteId(noteId);

    if (forceReindex) {
      await vectorStorageService.deleteEmbedding(
        normalizedId,
        NOTES_COLLECTION
      );
      // Invalidate cache since we've modified the index
      invalidateIndexCache();
    } else {
      // Check if this note is already indexed
      const isNoteIndexed = await checkIsNoteIndexed(normalizedId);

      if (isNoteIndexed) {
        // console.log(`Note ${normalizedId} is already indexed, skipping`);
        return true;
      }
    }

    // Store the embedding with normalized ID (always forward slashes)
    await vectorStorageService.storeEmbedding(
      normalizedId,
      NOTES_COLLECTION,
      embedding
    );

    // Invalidate cache since we've added a new indexed note
    invalidateIndexCache();

    return true;
  } catch (error) {
    console.error(`Error indexing note ${noteId}:`, error);
    return false;
  }
}

/*
 * Normalize a note ID to ensure consistency
 * @param id The note ID to normalize
 */
export function normalizeNoteId(id: string): string {
  // First remove any existing 'notes/' prefix to avoid duplication
  let normalizedId = id;
  if (normalizedId.startsWith('notes/')) {
    normalizedId = normalizedId.substring('notes/'.length);
  }

  // Convert backslashes to forward slashes for consistent storage
  normalizedId = normalizedId.replace(/\\/g, '/');

  // Ensure we're not losing the folder path - check if we need to extract the filename only
  const lastSlashIndex = normalizedId.lastIndexOf('/');
  if (lastSlashIndex !== -1) {
    // This is a full path with folders - keep the entire path
    // We don't need to do anything special, just return the normalized path
  }

  // We want to store IDs WITHOUT the notes/ prefix but WITH the full folder path
  return normalizedId;
}

/**
 * Search notes by similarity to the query text
 */
export async function searchNotesBySimilarity(
  query: string,
  embedding: number[],
  limit: number = 10,
  minSimilarity: number = 0
): Promise<NoteSearchResult[]> {
  try {
    // Use the vectorStorageService to search for similar notes
    const similarNotes = await vectorStorageService.searchSimilarVectors(
      NOTES_COLLECTION,
      embedding,
      limit,
      [], // No specific IDs to filter by
      minSimilarity // Pass the minimum similarity threshold
    );

    // Get all notes from the file system
    const allNotes = await getFileNotes();
    const noteMap = new Map(
      allNotes.map((note) => [normalizeNoteId(note.path), note])
    );

    // Map the results to NoteSimilarityResult objects
    const results = await Promise.all(
      similarNotes.map(async (result) => {
        // Find the corresponding note in the file system
        const noteId = result.documentId;
        const note = noteMap.get(noteId);

        if (!note) {
          console.log(`Note ${noteId} not found in file system`);
          return null;
        }

        // Get the note content
        let preview = '';
        try {
          const content = await getNoteContent(note.path);
          // Use the content directly since getNoteContent returns a string
          preview = content.substring(0, 150) + '...';
        } catch (error) {
          console.error(`Error getting content for note ${note.path}:`, error);
        }

        return {
          id: note.id,
          title: note.title,
          path: note.path,
          preview,
          similarity: result.similarity,
        } as NoteSimilarityResult;
      })
    );

    // Filter out null results and sort by similarity
    const validResults = results
      .filter((result): result is NoteSimilarityResult => result !== null)
      .sort((a, b) => b.similarity - a.similarity);

    // Convert to the expected NoteSearchResult format
    return validResults.map((result) => ({
      id: result.id,
      title: result.title,
      path: result.path,
      preview: result.preview,
      score: result.similarity,
    }));
  } catch (error) {
    console.error('Error searching notes by similarity:', error);
    return [];
  }
}

/**
 * Delete vectors for a specific note
 */
export async function deleteNoteVectors(noteId: string): Promise<boolean> {
  try {
    console.log(`Deleting vectors for note: ${noteId}`);

    await vectorStorageService.deleteEmbedding(noteId, NOTES_COLLECTION);

    // Invalidate cache since we've modified the index
    invalidateIndexCache();

    return true;
  } catch (error) {
    console.error(`Error deleting vectors for note ${noteId}:`, error);
    return false;
  }
}

/**
 * Delete all vectors in the notes collection
 */
export async function clearCollection(): Promise<boolean> {
  try {
    console.log(`Clearing collection for notes`);

    await vectorStorageService.clearCollection(NOTES_COLLECTION);

    // Invalidate cache since we've cleared the index
    invalidateIndexCache();

    return true;
  } catch (error) {
    console.error(`Error clearing collection for notes:`, error);
    return false;
  }
}

/**
 * Get notes that need to be indexed
 * This function doesn't generate embeddings, it just identifies which notes need them
 * @returns Information about indexed notes and those needing indexing
 */
export async function getNotesNeedingIndexing(): Promise<{
  alreadyIndexed: string[];
  needsIndexing: { id: string; path: string; title: string }[];
  total: number;
}> {
  try {
    // Get all notes from the file system
    const allNotes = await getFileNotes();
    const noteFiles = allNotes.filter((note) => !note.isFolder);
    const total = noteFiles.length;

    if (total === 0) {
      return { alreadyIndexed: [], needsIndexing: [], total: 0 };
    }

    // Get all indexed note IDs (will use cache if available)
    const indexedIds = await getIndexedNotes();

    // Create normalized versions of indexed IDs for comparison
    const normalizedIndexedIds = new Set(
      indexedIds.map((id) => normalizeNoteId(id))
    );

    // Find notes that aren't indexed yet
    const needsIndexing = [];
    const alreadyIndexed = [];

    // Process in smaller batches to keep the app responsive
    const batchSize = 50;
    for (let i = 0; i < noteFiles.length; i += batchSize) {
      const batch = noteFiles.slice(i, i + batchSize);

      for (const note of batch) {
        const normalizedPath = normalizeNoteId(note.path);
        if (normalizedIndexedIds.has(normalizedPath)) {
          alreadyIndexed.push(normalizedPath);
        } else {
          needsIndexing.push({
            id: note.id,
            path: note.path,
            title: note.title,
          });
        }
      }
    }

    return {
      alreadyIndexed,
      needsIndexing,
      total,
    };
  } catch (error) {
    console.error('Error getting notes needing indexing:', error);
    return { alreadyIndexed: [], needsIndexing: [], total: 0 };
  }
}
