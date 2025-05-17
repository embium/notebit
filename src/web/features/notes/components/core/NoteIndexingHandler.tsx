import { useEffect } from 'react';
import { useVectorIndexing } from '../../hooks/useVectorIndexing';
import { trpcProxyClient } from '@shared/config';

/**
 * Component that handles the coordination of note vector indexing
 * This should be mounted once in the app, typically in a layout component
 */
export function NoteIndexingHandler() {
  const { checkIndexingStatus } = useVectorIndexing();

  useEffect(() => {
    // Check if notes are already indexed
    const checkIndexingNeeded = async () => {
      try {
        // First check if we're already indexing
        const status = await checkIndexingStatus();
        if (status.isIndexing) {
          console.log('Indexing already in progress, not starting a new one');
          return;
        }

        // Check if notes are already indexed
        const isVectorIndexed =
          await trpcProxyClient.notes.isVectorIndexed.query();

        // Trigger background indexing if needed, with a short delay to allow UI to load first
        if (!isVectorIndexed) {
          console.log('Notes not indexed, will trigger background indexing');
          setTimeout(() => {
            trpcProxyClient.notes.startIndexing
              .mutate({})
              .then((result) => {
                console.log('Indexing started in background:', result);
              })
              .catch((error) => {
                console.error('Error starting background indexing:', error);
              });
          }, 5000); // 5 second delay to allow app to initialize
        } else {
          console.log('Notes already indexed, no need to start indexing');
        }
      } catch (error) {
        console.error('Error checking if indexing is needed:', error);
      }
    };

    // Start the check with a small delay to allow other initialization to complete
    setTimeout(() => {
      checkIndexingNeeded();
    }, 2000);
  }, [checkIndexingStatus]);

  // This component doesn't render anything
  return null;
}

export default NoteIndexingHandler;
