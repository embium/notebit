import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { trpcProxyClient } from '@shared/config';
import { generateEmbedding } from '@/shared/ai/embeddingUtils';
import { searchState$ } from '@/features/notes/state/searchState';

// Type definitions for indexing operations
interface IndexingStatus {
  isIndexing: boolean;
  shouldAbort: boolean;
}

// Interface matching the server event structure
interface IndexingStatusEvent {
  status: string;
  total?: number;
  processed?: number;
  errors?: number;
  message?: string;
}

// Our local progress state
interface IndexingProgress {
  total: number;
  processed: number;
  status: 'idle' | 'started' | 'progress' | 'completed' | 'error' | 'aborted';
  errors?: number;
  message?: string;
}

// Interface for results from the startIndexing procedure
type IndexingResult =
  | { success: true; status: 'started'; message: string; total: number }
  | { success: false; status: 'skipped'; message: string }
  | {
      success: true;
      status: 'completed';
      message: string;
      processed: number;
      total: number;
    }
  | { success: false; status: 'error'; message: string; error?: string };

interface NoteEmbeddingRequest {
  noteId: string;
  path: string;
}

/**
 * Hook to handle vector indexing coordination between main process and renderer
 * This replaces the direct indexing approach with a more efficient event-based system
 */
export function useVectorIndexing() {
  const [isIndexing, setIsIndexing] = useState(false);
  const [progress, setProgress] = useState<IndexingProgress>({
    total: 0,
    processed: 0,
    status: 'idle',
  });
  const [lastToastId, setLastToastId] = useState<string | number | null>(null);
  const [lastProgressUpdate, setLastProgressUpdate] = useState(0);

  // Start indexing of notes
  const startIndexing = async (forceReindex = false) => {
    try {
      const result = await trpcProxyClient.notes.startIndexing.mutate({
        forceReindex,
      });

      // Handle different result types
      if (result.status === 'started') {
        setIsIndexing(true);
        // Also update the global searchState
        searchState$.isIndexing.set(true);
        searchState$.shouldAbortIndexing.set(false);

        setProgress({
          total: 'total' in result ? result.total : 0,
          processed: 0,
          status: 'started',
        });

        if ('total' in result) {
          toast.info(`Preparing to process ${result.total} notes for indexing`);
        } else {
          toast.info('Preparing notes for indexing');
        }
      } else if (result.status === 'skipped') {
        toast.info('Indexing already in progress');
      } else if (result.status === 'completed') {
        toast.success('Notes already indexed');
      } else if (result.status === 'error') {
        toast.error(`Error starting indexing: ${result.message}`);
      }

      return result;
    } catch (error) {
      console.error('Error starting indexing:', error);
      toast.error('Failed to start indexing');
      return {
        success: false,
        status: 'error',
        message: String(error),
      } as const;
    }
  };

  // Stop any ongoing indexing
  const stopIndexing = async () => {
    try {
      // Update both local and global state
      searchState$.shouldAbortIndexing.set(true);

      const result = await trpcProxyClient.notes.stopIndexing.mutate();
      if (result.success) {
        toast.info('Stopping indexing...');
      }
      return result;
    } catch (error) {
      console.error('Error stopping indexing:', error);
      return { success: false, message: String(error) };
    }
  };

  // Check indexing status
  const checkIndexingStatus = async (): Promise<IndexingStatus> => {
    try {
      const status = await trpcProxyClient.notes.getIndexingStatus.query();

      // Update both local and global state
      setIsIndexing(status.isIndexing);
      searchState$.isIndexing.set(status.isIndexing);

      return status;
    } catch (error) {
      console.error('Error checking indexing status:', error);
      return { isIndexing: false, shouldAbort: false };
    }
  };

  // Clean up the embedding for a note in response to a request from the main process
  const handleNoteNeedsEmbedding = async (
    data: NoteEmbeddingRequest
  ): Promise<void> => {
    try {
      // Get note content
      const content = await trpcProxyClient.notes.getContent.query(data.path);

      // Generate embedding in the renderer process where AI models are available
      const embedding = await generateEmbedding(content);

      if (!embedding) {
        console.warn(`Couldn't generate embedding for ${data.noteId}`);
        return;
      }

      // Send the embedding back to the main process for storage
      await trpcProxyClient.notes.indexNote.mutate({
        noteId: data.noteId,
        embedding,
      });

      console.log(`Indexed note ${data.noteId}`);
    } catch (error) {
      console.error(
        `Error processing embedding for note ${data.noteId}:`,
        error
      );
    }
  };

  // Listen for indexing events
  useEffect(() => {
    // Subscribe to indexing status updates
    const indexingStatusUnsubscribe =
      trpcProxyClient.notes.onIndexingStatus.subscribe(undefined, {
        onData: (data: IndexingStatusEvent) => {
          const isCurrentlyIndexing =
            data.status !== 'completed' &&
            data.status !== 'error' &&
            data.status !== 'aborted';

          // Update both local and global state
          setIsIndexing(isCurrentlyIndexing);
          searchState$.isIndexing.set(isCurrentlyIndexing);

          setProgress({
            total: data.total || 0,
            processed: data.processed || 0,
            status: data.status as IndexingProgress['status'],
            errors: data.errors,
            message: data.message,
          });

          // Show toast notifications for important events
          if (data.status === 'started') {
            toast.info(`Preparing to process ${data.total} notes for indexing`);
          } else if (data.status === 'progress') {
            // Only show progress updates every 5 notes or if it's been more than 3 seconds
            const currentTime = Date.now();
            if (
              data.processed !== undefined &&
              data.total !== undefined &&
              (data.processed % 5 === 0 ||
                currentTime - lastProgressUpdate > 3000)
            ) {
              // Dismiss previous progress toast if it exists
              if (lastToastId) {
                toast.dismiss(lastToastId);
              }

              // Show new progress toast
              const id = toast.info(
                `Indexed ${data.processed} out of ${data.total} notes`,
                {
                  duration: 3000,
                }
              );
              setLastToastId(id);
              setLastProgressUpdate(currentTime);
            }
          } else if (data.status === 'completed') {
            // Dismiss any existing progress toast
            if (lastToastId) {
              toast.dismiss(lastToastId);
              setLastToastId(null);
            }

            toast.success(
              `Indexing completed! Processed ${data.processed || 0} out of ${data.total || 0} notes.`
            );
          } else if (data.status === 'error') {
            toast.error(`Indexing error: ${data.message || 'Unknown error'}`);
          } else if (data.status === 'aborted') {
            toast.info('Indexing was aborted');
          }
        },
        onError: (error: unknown) => {
          console.error('Error in indexing status subscription:', error);
          setIsIndexing(false);
          searchState$.isIndexing.set(false);
        },
      });

    // Subscribe to note needs embedding events
    const noteNeedsEmbeddingUnsubscribe =
      trpcProxyClient.notes.onNoteNeedsEmbedding.subscribe(undefined, {
        onData: (data: NoteEmbeddingRequest) => {
          handleNoteNeedsEmbedding(data);
        },
        onError: (error: unknown) => {
          console.error('Error in note embedding subscription:', error);
        },
      });

    // Check initial indexing status and sync with global state
    checkIndexingStatus().catch(console.error);

    // Clean up subscriptions on unmount
    return () => {
      indexingStatusUnsubscribe.unsubscribe();
      noteNeedsEmbeddingUnsubscribe.unsubscribe();
    };
  }, [lastToastId, lastProgressUpdate]);

  return {
    isIndexing,
    progress,
    startIndexing,
    stopIndexing,
    checkIndexingStatus,
  };
}

export default useVectorIndexing;
