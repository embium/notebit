import { store } from '@shared/storage';
import { NoteSearchResult } from '@shared/types/notes';
import { getVectorStorage, searchSimilarVectors } from '@shared/vector-storage';
import {
  getAllNotes as getFileNotes,
  getNoteContent,
} from './notesFileService';

/**
 * Define type for Note document
 */
interface NoteDocument {
  _id: string;
  title?: string;
  content?: string;
  path?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

/**
 * The collection name used for notes in the vector database
 */
const NOTES_COLLECTION = 'notes';

/**
 * Check if notes have been indexed
 */
export async function isNotesIndexed(): Promise<boolean> {
  try {
    const vectorStorage = getVectorStorage();
    await vectorStorage.initialize();

    // Check if there are any notes in the collection
    const indexedNoteIds =
      await vectorStorage.getAllDocumentIds(NOTES_COLLECTION);
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
    // console.log('Listing all indexed notes...');

    const vectorStorage = getVectorStorage();
    await vectorStorage.initialize();

    // Use the new getAllDocumentIds method
    return await vectorStorage.getAllDocumentIds(NOTES_COLLECTION);
  } catch (error) {
    console.error('Error getting indexed notes:', error);
    return [];
  }
}

export async function checkIsNoteIndexed(noteId: string): Promise<boolean> {
  const vectorStorage = getVectorStorage();
  await vectorStorage.initialize();

  const indexedIds = await getIndexedNotes();
  return indexedIds.includes(noteId);
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
    // Initialize vector storage
    const vectorStorage = getVectorStorage();
    await vectorStorage.initialize();

    // Normalize the ID to ensure consistency
    const normalizedId = normalizeNoteId(noteId);

    if (forceReindex) {
      await vectorStorage.deleteDocumentVectors(normalizedId, NOTES_COLLECTION);
    }

    const isNoteIndexed = await checkIsNoteIndexed(normalizedId);

    if (isNoteIndexed) {
      console.log(`Note ${normalizedId} is already indexed`);
      return true;
    }

    // Store the embedding with normalized ID (always forward slashes)
    await vectorStorage.storeEmbedding(
      normalizedId,
      NOTES_COLLECTION,
      embedding
    );

    return true;
  } catch (error) {
    console.error('Error indexing notes:', error);
    return false;
  }
}

/**
 * Normalize a note ID to ensure consistency
 * @param id The note ID to normalize
 */
function normalizeNoteId(id: string): string {
  // First remove any existing 'notes/' prefix to avoid duplication
  let normalizedId = id;
  if (normalizedId.startsWith('notes/')) {
    normalizedId = normalizedId.substring('notes/'.length);
  }

  // Convert backslashes to forward slashes for consistent storage
  normalizedId = normalizedId.replace(/\\/g, '/');

  // We want to store IDs WITHOUT the notes/ prefix
  return normalizedId;
}

/**
 * Convert note ID to platform-specific format for file system comparisons
 * @param id The note ID to convert
 */
function toPlatformPath(id: string): string {
  // On Windows, convert forward slashes to backslashes
  if (process.platform === 'win32') {
    return id.replace(/\//g, '\\');
  }
  return id;
}

/**
 * Search for notes similar to the given text
 */
export async function searchNotesBySimilarity(
  query: string,
  embedding: number[],
  limit: number = 30
): Promise<NoteSearchResult[]> {
  try {
    console.log(`Searching for notes similar to: "${query}"`);

    // First, load all notes to have them available for matching
    const allNotes = await getFileNotes();
    const notesMap = new Map<string, any>();

    // Create multiple maps with different key formats to increase matching chances
    for (const note of allNotes) {
      if (note.isFolder) continue; // Skip folders

      // Store with original ID
      notesMap.set(note.id, note);

      // Store with normalized ID (forward slashes)
      const normalizedId = normalizeNoteId(note.id);
      notesMap.set(normalizedId, note);

      // Store with platform path
      const platformId = toPlatformPath(note.id);
      notesMap.set(platformId, note);

      // Store with notes/ prefix
      notesMap.set(`notes/${note.id}`, note);
      notesMap.set(`notes/${normalizedId}`, note);
    }

    console.log(
      `Loaded ${allNotes.length} notes, with ${notesMap.size} lookup variations`
    );

    // Search for similar vectors - get more than we need to filter by similarity threshold
    const similarVectors = await searchSimilarVectors(
      embedding,
      NOTES_COLLECTION,
      Math.max(limit) // Get more results than needed to allow for filtering
    );

    console.log(
      `Found ${similarVectors.length} similar vectors before filtering`
    );

    // Apply a similarity threshold to avoid returning unrelated results
    // Cosine similarity ranges from -1 to 1, with 1 being identical
    // We'll use a reasonable threshold that can be adjusted based on testing
    const SIMILARITY_THRESHOLD = 0.5; // Minimum similarity score to consider a result relevant

    const filteredVectors = similarVectors.filter(
      (vector) => vector.similarity >= SIMILARITY_THRESHOLD
    );

    console.log(
      `After filtering by threshold ${SIMILARITY_THRESHOLD}: ${filteredVectors.length} vectors remain`
    );

    // Convert to search results
    const results: NoteSearchResult[] = [];

    for (const vector of filteredVectors) {
      // Stop processing once we have enough results
      if (results.length >= limit) {
        console.log(`Reached limit of ${limit} results, stopping processing`);
        break;
      }

      // Try multiple variations of the ID to increase chances of finding a match
      const vectorId = vector.documentId;
      console.log(
        `Looking for note with vector ID: ${vectorId} (similarity: ${vector.similarity.toFixed(4)})`
      );

      // Try with various formats
      const idVariations = [
        vectorId, // As returned from vector storage
        normalizeNoteId(vectorId), // Normalized (ensures forward slashes)
        toPlatformPath(vectorId), // Platform-specific (backslashes on Windows)
        `notes/${vectorId}`, // With notes/ prefix
        normalizeNoteId(`notes/${vectorId}`), // Normalized with notes/ prefix
        // Add a version with and without quotes in case they were included in the path
        vectorId.replace(/"/g, ''), // Without quotes
        vectorId.replace(/"/g, '\\"'), // With escaped quotes
      ];

      let fileNote = null;
      let matchedVariation = '';

      // Try each variation until we find a match
      for (const idVar of idVariations) {
        if (notesMap.has(idVar)) {
          fileNote = notesMap.get(idVar);
          matchedVariation = idVar;
          break;
        }
      }

      if (fileNote) {
        try {
          // Get content from file service
          const content = await getNoteContent(fileNote.path);

          results.push({
            id: fileNote.id,
            title: fileNote.title || 'Untitled Note',
            preview: content.substring(0, 150) + '...',
            path: fileNote.path || '',
            score: vector.similarity * 100,
          });
          console.log(
            `Found matching note: ${fileNote.id} (matched as ${matchedVariation}) with score ${(vector.similarity * 100).toFixed(2)}`
          );
          continue;
        } catch (error) {
          console.warn(`Error getting content for note ${vectorId}:`, error);
        }
      } else {
        console.warn(
          `Note not found with any variation of vector ID: ${vectorId}. Available variations tried: ${idVariations.join(', ')}`
        );

        // If file lookup fails, fall back to store lookup as a last resort
        try {
          // Try all variations with store
          let note: NoteDocument | null = null;

          for (const idVar of idVariations) {
            try {
              note = (await store.get(idVar)) as NoteDocument;
              if (note) {
                console.log(`Found note in store with ID variation: ${idVar}`);
                break;
              }
            } catch {
              // Continue trying other variations
            }
          }

          if (note) {
            results.push({
              id: note._id,
              title: note.title || 'Untitled Note',
              preview:
                getNoteContentForEmbedding(note).substring(0, 150) + '...',
              path: note.path || '',
              score: vector.similarity * 100,
            });
          } else {
            console.warn(
              `Couldn't find note ${vectorId} in database or file system with any ID variation`
            );
          }
        } catch (error) {
          console.warn(`Couldn't find note ${vectorId} in database`);
        }
      }
    }

    // Log summary of search results
    if (results.length > 0) {
      console.log(`Returning ${results.length} search results with scores:`);
      results.forEach((r) =>
        console.log(`- ${r.title}: ${r.score.toFixed(2)}`)
      );
    } else {
      console.log('No search results found that meet the similarity threshold');
    }

    return results;
  } catch (error) {
    console.error('Error searching notes by similarity:', error);
    return [];
  }
}

export function getNoteContentForEmbedding(note: any): string {
  // Combine title and content
  const title = note.title || '';
  const content = note.content || '';

  // If we have both, combine them
  if (title && content) {
    return `${title}\n\n${content}`;
  }

  // Otherwise return whichever we have
  return title || content;
}

/**
 * Delete vectors for a specific note
 */
export async function clearCollection(): Promise<boolean> {
  try {
    console.log(`Clearing collection for notes`);

    const vectorStorage = getVectorStorage();
    await vectorStorage.initialize();

    await vectorStorage.clearCollection(NOTES_COLLECTION);

    return true;
  } catch (error) {
    console.error(`Error clearing collection for notes:`, error);
    return false;
  }
}

/**
 * Delete vectors for a specific note
 */
export async function deleteNoteVectors(noteId: string): Promise<boolean> {
  try {
    console.log(`Deleting vectors for note: ${noteId}`);

    const vectorStorage = getVectorStorage();
    await vectorStorage.initialize();

    await vectorStorage.deleteDocumentVectors(noteId, NOTES_COLLECTION);

    return true;
  } catch (error) {
    console.error(`Error deleting vectors for note ${noteId}:`, error);
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
    console.log('Checking which notes need indexing...');

    // Get all notes from the file system
    const allNotes = await getFileNotes();
    const noteFiles = allNotes.filter((note) => !note.isFolder);
    const total = noteFiles.length;

    console.log(`Found ${total} total notes from file system`);

    if (total === 0) {
      return { alreadyIndexed: [], needsIndexing: [], total: 0 };
    }

    // Get all indexed note IDs
    const vectorStorage = getVectorStorage();
    await vectorStorage.initialize();

    const indexedIds = await getIndexedNotes();
    console.log(`Found ${indexedIds.length} already indexed notes`);

    // Create normalized versions of indexed IDs for comparison
    const normalizedIndexedIds = new Set(
      indexedIds.map((id) => normalizeNoteId(id))
    );

    // Find notes that aren't indexed yet
    const needsIndexing = [];
    const alreadyIndexed = [];

    for (const note of noteFiles) {
      const normalizedId = normalizeNoteId(note.id);

      // Check if this note is already indexed (using normalized ID)
      if (normalizedIndexedIds.has(normalizedId)) {
        alreadyIndexed.push(normalizedId);
        continue;
      }

      // Check if note has content before adding to the indexing list
      try {
        const content = await getNoteContent(note.path);
        if (!content || content.trim().length === 0) {
          console.log(`Skipping empty note: ${normalizedId}`);
          continue;
        }

        needsIndexing.push({
          id: normalizedId,
          path: note.path,
          title: note.title,
        });
      } catch (error) {
        console.error(`Error checking content for note ${note.id}:`, error);
      }
    }

    console.log(`Notes already indexed: ${alreadyIndexed.length}`);
    console.log(`Notes needing indexing: ${needsIndexing.length}`);

    return {
      alreadyIndexed,
      needsIndexing,
      total,
    };
  } catch (error) {
    console.error('Error checking indexed notes:', error);
    return { alreadyIndexed: [], needsIndexing: [], total: 0 };
  }
}
