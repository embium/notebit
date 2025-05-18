import { useEffect } from 'react';
import { useVectorIndexing } from '../../hooks/useVectorIndexing';
import { trpcProxyClient } from '@shared/config';

const INDEXING_CHECK_KEY = 'notebit_indexing_check_performed';

/**
 * Component that handles the coordination of note vector indexing
 * This should be mounted once in the app, typically in a layout component
 */
export function NoteIndexingHandler() {
  const { checkIndexingStatus, startIndexing } = useVectorIndexing();

  useEffect(() => {
    // Check if we've already performed indexing check in this session
    if (localStorage.getItem(INDEXING_CHECK_KEY) === 'true') {
      console.log('Indexing check already performed in this session');
      return;
    }

    // Mark that we've performed the indexing check in this session
    localStorage.setItem(INDEXING_CHECK_KEY, 'true');

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
        const notesNeedingIndexing =
          await trpcProxyClient.notes.getNotesNeedingIndexing.query();
        console.log(
          'INDEXING DEBUG: Notes needing indexing:',
          notesNeedingIndexing
        );
        const needsIndexing = notesNeedingIndexing.needsIndexing.length > 0;

        // Trigger background indexing if needed, with a short delay to allow UI to load first
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
        }
      } catch (error) {
        console.error('Error checking if indexing is needed:', error);
      }
    };

    // Start the check with a small delay to allow other initialization to complete
    setTimeout(() => {
      checkIndexingNeeded();
    }, 2000);
  }, [checkIndexingStatus, startIndexing]);

  // This component doesn't render anything
  return null;
}

export default NoteIndexingHandler;
