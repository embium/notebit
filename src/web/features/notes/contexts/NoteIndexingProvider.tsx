import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from 'react';
import { useVectorIndexing } from '../hooks/useVectorIndexing';
import { trpcProxyClient } from '@shared/config';
import { aiMemorySettings$ } from '../../settings/state/aiSettings/aiMemorySettings';

// Static flag to ensure indexing is only initialized once across all instances
// This is outside the component to persist across component mounts/unmounts
let hasInitializedIndexing = false;

interface IndexingContextType {
  isIndexingComplete: boolean;
  isIndexing: boolean;
  indexingProgress: {
    total: number;
    processed: number;
  };
  triggerManualIndexing: (forceReindex?: boolean) => Promise<void>;
}

const IndexingContext = createContext<IndexingContextType | undefined>(
  undefined
);

/**
 * Provider component that handles note vector indexing once per session
 * and provides indexing state to the application
 */
export function NoteIndexingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { checkIndexingStatus, startIndexing } = useVectorIndexing();
  const [isIndexingComplete, setIsIndexingComplete] = useState(false);
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexingProgress, setIndexingProgress] = useState({
    total: 0,
    processed: 0,
  });

  // Function to manually trigger indexing
  const triggerManualIndexing = async (forceReindex = false) => {
    try {
      const result = await startIndexing(forceReindex);
      console.log('Manual indexing triggered:', result);
    } catch (error) {
      console.error('Error triggering manual indexing:', error);
    }
  };

  // Run indexing check once on app startup
  useEffect(() => {
    // Set up subscription to indexing status updates first
    const subscription = trpcProxyClient.notes.onIndexingStatus.subscribe(
      undefined,
      {
        onData: (data) => {
          setIsIndexing(
            data.status === 'started' || data.status === 'progress'
          );
          setIsIndexingComplete(data.status === 'completed');

          if (data.total !== undefined && data.processed !== undefined) {
            setIndexingProgress({
              total: data.total,
              processed: data.processed,
            });
          }
        },
        onError: (error) => {
          console.error('Error in indexing status subscription:', error);
          setIsIndexing(false);
        },
      }
    );

    // Only run the initialization logic once per app session
    if (!hasInitializedIndexing) {
      hasInitializedIndexing = true;
      console.log('Initializing indexing check (first time)');

      const checkIndexingNeeded = async () => {
        try {
          const embeddingModel = aiMemorySettings$.embeddingModel.get();
          if (!embeddingModel) {
            console.log('Embedding model not set, skipping');
            return;
          }

          // First check if we're already indexing
          const status = await checkIndexingStatus();
          setIsIndexing(status.isIndexing);

          if (status.isIndexing) {
            console.log('Indexing already in progress');
            return;
          }

          // Check if notes are already indexed
          const notesNeedingIndexing =
            await trpcProxyClient.notes.getNotesNeedingIndexing.query();

          console.log(
            'INDEXING DEBUG: Notes needing indexing:',
            notesNeedingIndexing
          );

          const needsIndexing = notesNeedingIndexing.needsIndexing.length > 0;

          // If indexing is needed, start it with a delay
          if (needsIndexing) {
            console.log('Notes not indexed, will trigger background indexing');
            setTimeout(() => {
              startIndexing(false)
                .then((result) => {
                  console.log('Indexing started in background:', result);
                })
                .catch((error) => {
                  console.error('Error starting background indexing:', error);
                });
            }, 5000); // 5 second delay to allow app to initialize
          } else {
            console.log('Notes already indexed, no need to start indexing');
            setIsIndexingComplete(true);
          }
        } catch (error) {
          console.error('Error checking if indexing is needed:', error);
        }
      };

      // Start the check with a small delay to allow other initialization to complete
      setTimeout(() => {
        checkIndexingNeeded();
      }, 2000);
    } else {
      console.log('Skipping indexing initialization (already done)');
    }

    // Cleanup subscription
    return () => {
      subscription.unsubscribe();
    };
  }, [checkIndexingStatus, startIndexing]);

  const value = {
    isIndexingComplete,
    isIndexing,
    indexingProgress,
    triggerManualIndexing,
  };

  return (
    <IndexingContext.Provider value={value}>
      {children}
    </IndexingContext.Provider>
  );
}

/**
 * Hook to access the indexing context
 */
export function useNoteIndexing() {
  const context = useContext(IndexingContext);
  if (context === undefined) {
    throw new Error(
      'useNoteIndexing must be used within a NoteIndexingProvider'
    );
  }
  return context;
}
