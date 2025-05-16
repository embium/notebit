import { publicProcedure, router } from '@shared/trpc';
import { z } from 'zod';
import {
  initializeNotesDirectory,
  createNote,
  createFolder,
  getNoteContent,
  updateNoteContent,
  updateNoteTitle,
  deleteNote,
  getAllNotes,
  moveItem,
  getNotesDirectory,
  setNotesDirectory,
  searchNotes,
  preloadNotesForSearch,
} from '@shared/services/notesFileService';
import {
  isNotesIndexed,
  getIndexedNotes,
  getNotesNeedingIndexing,
  indexNote as indexNoteVector,
  searchNotesBySimilarity,
  clearCollection,
  deleteNoteVectors,
  invalidateIndexCache,
  normalizeNoteId,
} from '@shared/services/notesVectorService';
import {
  initializeNotesWatcher,
  stopWatching,
  changeWatchedDirectory,
} from '../services/notesWatcherService';
import { observable } from '@trpc/server/observable';

// Import electron conditionally in main process only
// This avoids issues when this file is imported in the renderer
let dialog: any;
if (process.type === 'browser') {
  // Only import in main process (Electron)
  const electron = require('electron');
  dialog = electron.dialog;
}

// Create a global flag to track if file system watcher is initialized
let isWatcherInitialized = false;

// Main process implementation of the notes router
export const notesRouter = router({
  // Initialize notes directory
  initialize: publicProcedure.mutation(async () => {
    await initializeNotesDirectory();
    return true;
  }),

  // Get all notes
  getAll: publicProcedure.query(async () => {
    return await getAllNotes();
  }),

  // Get note content
  getContent: publicProcedure.input(z.string()).query(async ({ input }) => {
    return await getNoteContent(input);
  }),

  // Search notes by content
  searchNotes: publicProcedure
    .input(
      z.object({
        query: z.string(),
        limit: z.number().optional().default(20),
      })
    )
    .query(async ({ input }) => {
      return await searchNotes(input.query, input.limit);
    }),

  // Preload notes for faster searching
  preloadNotesForSearch: publicProcedure.mutation(async () => {
    await preloadNotesForSearch();
    return true;
  }),

  // Index notes for vector search
  indexNote: publicProcedure
    .input(
      z.object({
        noteId: z.string(),
        embedding: z.array(z.number()),
        forceReindex: z.boolean().optional().default(false),
      })
    )
    .mutation(async ({ input }) => {
      // Perform the indexing
      const success = await indexNoteVector(
        input.noteId,
        input.embedding,
        input.forceReindex
      );

      // Verify the note was actually indexed
      if (success) {
        // Force invalidation of cache to ensure fresh check
        invalidateIndexCache();

        // Get all indexed notes to verify and for logs
        const indexedNotes = await getIndexedNotes();
        // Check if our note is really there
        const normalizedId = normalizeNoteId(input.noteId);
        const normalizedIndexedIds = indexedNotes.map((id) =>
          normalizeNoteId(id)
        );
        const isIndexed = normalizedIndexedIds.includes(normalizedId);

        // If verification fails but indexing reported success, try again once
        if (!isIndexed) {
          const retryResult = await indexNoteVector(
            input.noteId,
            input.embedding,
            true
          );
          return retryResult;
        }
      }

      return success;
    }),

  // Clear collection
  clearVectorCollection: publicProcedure.mutation(async () => {
    await clearCollection();
    return true;
  }),

  // Search notes by semantic similarity
  semanticSearch: publicProcedure
    .input(
      z.object({
        query: z.string(),
        embedding: z.array(z.number()),
        limit: z.number().optional().default(20),
      })
    )
    .query(async ({ input }) => {
      return await searchNotesBySimilarity(
        input.query,
        input.embedding,
        input.limit
      );
    }),

  // Hybrid search combining keyword and semantic search
  hybridSearch: publicProcedure
    .input(
      z.object({
        query: z.string(),
        embedding: z.array(z.number()),
        limit: z.number().optional().default(20),
      })
    )
    .query(async ({ input }) => {
      // First do a semantic search
      const semanticResults = await searchNotesBySimilarity(
        input.query,
        input.embedding,
        input.limit
      );

      // Then do a keyword search
      const keywordResults = await searchNotes(input.query);

      // Combine and deduplicate results, prioritizing semantic search results
      const allResults = [...semanticResults];
      const semanticIds = new Set(semanticResults.map((r) => r.id));

      for (const keywordResult of keywordResults) {
        if (!semanticIds.has(keywordResult.id)) {
          // Add keyword result with lower score
          allResults.push({
            ...keywordResult,
            score: Math.min(keywordResult.score, 60), // Cap keyword match scores
          });
        }
      }

      // Sort by score
      allResults.sort((a, b) => b.score - a.score);

      // Respect limit
      return allResults.slice(0, input.limit || 20);
    }),

  // Create new note
  createNote: publicProcedure
    .input(
      z.object({
        title: z.string(),
        content: z.string().optional().default(''),
        parentPath: z.string().optional().default(''),
      })
    )
    .mutation(async ({ input }) => {
      const result = await createNote(
        input.title,
        input.content,
        input.parentPath
      );

      return result;
    }),

  // Create new folder
  createFolder: publicProcedure
    .input(
      z.object({
        name: z.string(),
        parentPath: z.string().optional().default(''),
      })
    )
    .mutation(async ({ input }) => {
      return await createFolder(input.name, input.parentPath);
    }),

  // Update note content
  updateContent: publicProcedure
    .input(
      z.object({
        notePath: z.string(),
        content: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await updateNoteContent(input.notePath, input.content);

      return result;
    }),

  // Update note title
  updateTitle: publicProcedure
    .input(
      z.object({
        notePath: z.string(),
        newTitle: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      return await updateNoteTitle(input.notePath, input.newTitle);
    }),

  // Delete note or folder
  delete: publicProcedure.input(z.string()).mutation(async ({ input }) => {
    // Delete note's vectors
    try {
      await deleteNoteVectors(input);
    } catch (error) {
      console.error('Failed to delete note vectors:', error);
    }

    return await deleteNote(input);
  }),

  // Move note or folder
  moveItem: publicProcedure
    .input(
      z.object({
        sourcePath: z.string(),
        targetPath: z.string().optional().default(''),
      })
    )
    .mutation(async ({ input }) => {
      return await moveItem(input.sourcePath, input.targetPath);
    }),

  // Pick notes directory (open folder dialog)
  pickNotesDirectory: publicProcedure.mutation(async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Select Notes Folder',
    });
    if (!result.canceled && result.filePaths?.[0]) {
      return result.filePaths[0];
    }
    return null;
  }),

  // Get notes directory
  getNotesDirectory: publicProcedure.query(async () => {
    return await getNotesDirectory();
  }),

  // Set notes directory
  setNotesDirectory: publicProcedure
    .input(z.string())
    .mutation(async ({ input }) => {
      await setNotesDirectory(input);

      // Update watcher to point to the new directory
      if (isWatcherInitialized) {
        await changeWatchedDirectory(input);
      }

      return true;
    }),

  // Initialize file system watcher
  initializeWatcher: publicProcedure.mutation(async ({ ctx }) => {
    if (isWatcherInitialized) {
      console.log('Watcher already initialized');
      return true;
    }

    console.log('Initializing notes file system watcher');

    // Create a callback that will refresh notes list
    const refreshCallback = async () => {
      // Emit an event to clients to refresh notes
      if (ctx.ee) {
        ctx.ee.emit('NOTES_CHANGED');
      }
    };

    await initializeNotesWatcher(refreshCallback);
    isWatcherInitialized = true;
    return true;
  }),

  // Stop file system watcher
  stopWatcher: publicProcedure.mutation(async () => {
    await stopWatching();
    isWatcherInitialized = false;
    return true;
  }),

  // Subscribe to file system changes
  onFileSystemChanges: publicProcedure.subscription(({ ctx }) => {
    console.log('File system change subscription created');
    return observable<void>((emit) => {
      if (!ctx.ee) {
        console.error('Event emitter not available in context');
        return;
      }

      // Handler function to emit next value in the subscription
      const handleNotesChanged = () => {
        console.log('Emitting file system change event to subscription');
        emit.next();
      };

      // Subscribe to the NOTES_CHANGED event
      ctx.ee.on('NOTES_CHANGED', handleNotesChanged);

      // Clean up the subscription when client disconnects
      return () => {
        console.log('Cleaning up file system change subscription');
        ctx.ee.off('NOTES_CHANGED', handleNotesChanged);
      };
    });
  }),

  // Check if notes have been indexed for vector search
  isVectorIndexed: publicProcedure.query(async () => {
    return isNotesIndexed();
  }),

  // List all indexed notes (for debugging)
  listIndexedNotes: publicProcedure.query(async () => {
    return getIndexedNotes();
  }),

  // Get notes that need indexing
  getNotesNeedingIndexing: publicProcedure.query(async () => {
    return await getNotesNeedingIndexing();
  }),
});
