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
  checkIsNoteIndexed,
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

// Track indexing state
let isIndexingInProgress = false;
let shouldAbortIndexing = false;

/**
 * Main process implementation of the notes router
 */
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

  /**
   * Start background indexing of notes for vector search
   * This procedure coordinates the indexing process from the main process
   * while receiving embeddings from the renderer
   */
  startIndexing: publicProcedure
    .input(
      z.object({
        batchSize: z.number().optional().default(3),
        forceReindex: z.boolean().optional().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // If indexing is already in progress, don't start another
      if (isIndexingInProgress) {
        console.log('Indexing already in progress, skipping');
        return {
          success: false,
          message: 'Indexing already in progress',
          status: 'skipped',
        };
      }

      try {
        // Set indexing flags
        isIndexingInProgress = true;
        shouldAbortIndexing = false;

        // Get notes needing indexing
        const { needsIndexing, alreadyIndexed, total } =
          await getNotesNeedingIndexing();

        console.log(`Indexing status check complete: ${total} total notes`);
        console.log(`- ${alreadyIndexed.length} notes are already indexed`);
        console.log(`- ${needsIndexing.length} notes need indexing`);

        // Apply force reindexing logic if requested
        let notesToIndex = needsIndexing;
        if (input.forceReindex && alreadyIndexed.length > 0) {
          console.log(
            `Force reindexing requested, will reindex all ${total} notes`
          );
          // Get all notes from filesystem to include already indexed notes
          const allNotes = await getAllNotes();
          notesToIndex = allNotes
            .filter((note) => !note.isFolder)
            .map((note) => ({
              id: note.id,
              path: note.path,
              title: note.title,
            }));
        }

        // If no notes need indexing, we're done
        if (notesToIndex.length === 0) {
          isIndexingInProgress = false;
          return {
            success: true,
            message: 'No notes need indexing',
            status: 'completed',
            processed: 0,
            total,
          };
        }

        // Emit indexing started event if we have an event emitter
        if (ctx.ee) {
          ctx.ee.emit('INDEXING_STATUS', {
            status: 'started',
            total: notesToIndex.length,
            processed: 0,
          });
        }

        let successCount = 0;
        let errorCount = 0;

        // Return immediately so client isn't blocked, continue processing in background
        setTimeout(async () => {
          try {
            // Process notes in batches
            for (let i = 0; i < notesToIndex.length; i += input.batchSize) {
              // Check if we should abort
              if (shouldAbortIndexing) {
                console.log('Indexing aborted');
                if (ctx.ee) {
                  ctx.ee.emit('INDEXING_STATUS', {
                    status: 'aborted',
                    total: notesToIndex.length,
                    processed: i,
                  });
                }
                break;
              }

              const batch = notesToIndex.slice(i, i + input.batchSize);
              console.log(
                `Processing batch ${Math.floor(i / input.batchSize) + 1}/${Math.ceil(
                  notesToIndex.length / input.batchSize
                )}, size: ${batch.length}`
              );

              // Emit progress if we have an event emitter
              if (ctx.ee) {
                ctx.ee.emit('INDEXING_STATUS', {
                  status: 'progress',
                  total: notesToIndex.length,
                  processed: i,
                });
              }

              // Wait for all items in this batch to be processed
              await Promise.all(
                batch.map(async (note) => {
                  try {
                    // Emit note indexing event to get renderer to generate embedding
                    if (ctx.ee) {
                      ctx.ee.emit('NOTE_NEEDS_EMBEDDING', {
                        noteId: note.id,
                        path: note.path,
                      });
                    }
                  } catch (error) {
                    console.error(
                      `Error requesting embedding for note ${note.id}:`,
                      error
                    );
                    errorCount++;
                  }
                })
              );

              // Brief delay between batches to prevent overwhelming the system
              await new Promise((resolve) => setTimeout(resolve, 500));
            }

            // Finalize indexing
            console.log(
              `Indexing completed with ${successCount} successes and ${errorCount} errors`
            );
            if (ctx.ee) {
              ctx.ee.emit('INDEXING_STATUS', {
                status: 'completed',
                total: notesToIndex.length,
                processed: notesToIndex.length - errorCount,
                errors: errorCount,
              });
            }
          } catch (error) {
            console.error('Error in background indexing process:', error);
            if (ctx.ee) {
              ctx.ee.emit('INDEXING_STATUS', {
                status: 'error',
                message: 'Internal indexing error',
                error: String(error),
              });
            }
          } finally {
            isIndexingInProgress = false;
          }
        }, 0);

        // Return immediate response to client
        return {
          success: true,
          message: `Started indexing ${notesToIndex.length} notes in background`,
          status: 'started',
          total: notesToIndex.length,
        };
      } catch (error) {
        console.error('Error starting indexing:', error);
        isIndexingInProgress = false;
        return {
          success: false,
          message: 'Failed to start indexing',
          error: String(error),
          status: 'error',
        };
      }
    }),

  /**
   * Stop any ongoing indexing
   */
  stopIndexing: publicProcedure.mutation(() => {
    if (!isIndexingInProgress) {
      return { success: false, message: 'No indexing in progress' };
    }

    shouldAbortIndexing = true;
    return { success: true, message: 'Indexing will be stopped' };
  }),

  /**
   * Get current indexing status
   */
  getIndexingStatus: publicProcedure.query(() => {
    return {
      isIndexing: isIndexingInProgress,
      shouldAbort: shouldAbortIndexing,
    };
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

        // Check if our note is really indexed
        const isIndexed = await checkIsNoteIndexed(input.noteId);

        // If verification fails but indexing reported success, try again once
        if (!isIndexed) {
          console.log(
            `Verification failed for ${input.noteId}, retrying indexing`
          );
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

  /**
   * Subscribe to indexing status updates
   */
  onIndexingStatus: publicProcedure.subscription(({ ctx }) => {
    if (!ctx.ee) {
      console.error('Event emitter not available in context');
      return observable<{
        status: string;
        total?: number;
        processed?: number;
        errors?: number;
        message?: string;
      }>((emit) => {
        // No-op
      });
    }

    return observable<{
      status: string;
      total?: number;
      processed?: number;
      errors?: number;
      message?: string;
    }>((emit) => {
      const handleIndexingStatus = (data: {
        status: string;
        total?: number;
        processed?: number;
        errors?: number;
        message?: string;
      }) => {
        emit.next(data);
      };

      // Subscribe to the INDEXING_STATUS event
      ctx.ee.on('INDEXING_STATUS', handleIndexingStatus);

      // Clean up the subscription when client disconnects
      return () => {
        ctx.ee.off('INDEXING_STATUS', handleIndexingStatus);
      };
    });
  }),

  /**
   * Subscribe to note embedding requests
   */
  onNoteNeedsEmbedding: publicProcedure.subscription(({ ctx }) => {
    if (!ctx.ee) {
      console.error('Event emitter not available in context');
      return observable<{
        noteId: string;
        path: string;
      }>((emit) => {
        // No-op
      });
    }

    return observable<{
      noteId: string;
      path: string;
    }>((emit) => {
      const handleNoteNeedsEmbedding = (data: {
        noteId: string;
        path: string;
      }) => {
        emit.next(data);
      };

      // Subscribe to the NOTE_NEEDS_EMBEDDING event
      ctx.ee.on('NOTE_NEEDS_EMBEDDING', handleNoteNeedsEmbedding);

      // Clean up the subscription when client disconnects
      return () => {
        ctx.ee.off('NOTE_NEEDS_EMBEDDING', handleNoteNeedsEmbedding);
      };
    });
  }),
});
