import React, { useCallback, useEffect, useState } from 'react';
import { observer } from '@legendapp/state/react';
import { FiFolder } from 'react-icons/fi';
import { toast } from 'sonner';

// UI Components
import { Button } from '@/components/ui/button';

// State
import { searchState$ } from '@/features/notes/state/searchState';
import {
  fetchNotesDirectory,
  setNotesDirectory,
  pickNotesDirectory,
  generalSettingsState$,
} from '@/features/settings/state/generalSettingsState';
import { loadNotes, notesState$ } from '@/features/notes/state/notesState';

// Vector indexing
import { useVectorIndexing } from '@/features/notes/hooks/useVectorIndexing';

/**
 * NotesLocationSelector component
 * Allows user to view and change the notes directory
 */
const NotesLocationSelectorComponent: React.FC = () => {
  const notesDirectory = generalSettingsState$.notesDirectory.get();
  const [isChangingDirectory, setIsChangingDirectory] = useState(false);
  const isLoading = notesState$.isLoading.get();

  // Use the vector indexing hook
  const { isIndexing, startIndexing, stopIndexing } = useVectorIndexing();

  // Fetch notes directory on mount
  useEffect(() => {
    fetchNotesDirectory();
  }, []);

  // Open folder picker via TRPC (main process)
  const handlePickFolder = useCallback(async () => {
    // Only prevent new changes if we're already in the middle of changing a directory
    if (isChangingDirectory) {
      toast.info('Directory change already in progress');
      return;
    }

    try {
      setIsChangingDirectory(true);

      // If indexing is in progress, stop it
      if (isIndexing) {
        await stopIndexing();
        toast.info('Stopped current indexing to change directory');
        // Give it a moment to stop
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      const selectedPath = await pickNotesDirectory();

      if (!selectedPath) {
        setIsChangingDirectory(false);
        return;
      }

      // First update the directory in settings
      await setNotesDirectory(selectedPath);

      // Show a toast that we're loading notes
      toast.info('Loading notes from new directory...');

      // Load the notes from the new directory
      await loadNotes();

      // Start indexing the new directory
      toast.info('Starting indexing of new notes directory...');
      await startIndexing(true); // Force reindex with the new directory

      setIsChangingDirectory(false);
    } catch (error) {
      console.error('Error changing notes directory:', error);
      toast.error('Failed to change notes directory');
      setIsChangingDirectory(false);
    }
  }, [isChangingDirectory, isIndexing, stopIndexing, startIndexing]);

  return (
    <div className="flex items-center w-full">
      <input
        type="text"
        className="flex-1 rounded-l-md border border-border border-r-0 bg-muted px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
        value={notesDirectory}
        readOnly
        spellCheck={false}
        aria-label="Notes directory path"
      />
      <Button
        type="button"
        className="rounded-l-none rounded-r-md border border-border border-l-0 h-10 px-3 flex items-center gap-2"
        onClick={handlePickFolder}
        variant="outline"
        aria-label="Choose notes folder"
        disabled={isChangingDirectory} // Only disable while actively changing directory
      >
        <FiFolder className="mr-1" />
        {isChangingDirectory
          ? 'Processing...'
          : isIndexing
            ? 'Change (Stop Indexing)'
            : 'Change'}
      </Button>
    </div>
  );
};

export const NotesLocationSelector = observer(NotesLocationSelectorComponent);
