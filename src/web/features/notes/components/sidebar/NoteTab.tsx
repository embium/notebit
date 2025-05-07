import React, { useEffect } from 'react';
import { observer } from '@legendapp/state/react';
import { FiPlus, FiSearch } from 'react-icons/fi';

// UI Components
import { Button } from '@/components/ui/button';

// Components
import { NoteTabContent } from '@/features/notes/components/sidebar/NoteTabContent';
import {
  SearchTab,
  SearchTabHeader,
} from '@/features/notes/components/sidebar/SearchTab';

// State
import {
  createNote,
  setRequestTitleInputFocus,
  activeTab,
} from '@src/web/features/notes/state/notesState';
import {
  searchState$,
  setSearchActive,
  resetSearchStateDefaults,
} from '@src/web/features/notes/state/searchState';

// Static flag to track if this is the first component mount after app start
let isFirstMount = true;

/**
 * Header component for the notes tab
 */
const NoteTabHeaderComponent: React.FC = () => {
  const isSearchActive = searchState$.isSearchActive.get();

  // Log for debugging
  console.log('NotesTabHeader rendering, isSearchActive:', isSearchActive);

  // Handle creating a new note
  const handleCreateNote = React.useCallback(async () => {
    try {
      await createNote({});
      setTimeout(() => {
        setRequestTitleInputFocus(true);
      }, 100);
    } catch (error) {
      console.error('Error creating note:', error);
    }
  }, []);

  // Toggle search functionality
  const handleToggleSearch = React.useCallback(() => {
    console.log(
      'Search button clicked, setting search active to:',
      !isSearchActive
    );
    setSearchActive(!isSearchActive);
  }, [isSearchActive]);

  // If search is active, render the search tab header
  if (isSearchActive) {
    return <SearchTabHeader onToggleSearch={handleToggleSearch} />;
  }

  return (
    <div className="flex gap-1">
      <Button
        variant="ghost"
        size="sm"
        className="text-xs"
        onClick={handleToggleSearch}
        aria-label="Search notes"
      >
        <FiSearch size={14} />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="text-xs"
        onClick={handleCreateNote}
        aria-label="Create new note"
      >
        <FiPlus size={14} />
      </Button>
    </div>
  );
};

export const NoteTabHeader = observer(NoteTabHeaderComponent);

/**
 * Main component for the notes tab
 */
const NoteTabComponent: React.FC = () => {
  const isSearchActive = searchState$.isSearchActive.get();
  const wasOnSearch = searchState$.wasOnSearchBeforeLeavingNotes.get();
  const currentActiveTab = activeTab.get();
  const [previousTab, setPreviousTab] = React.useState<string | null>(null);

  // Reset search state on first mount after app start
  useEffect(() => {
    if (isFirstMount) {
      console.log('First mount of NoteTab, resetting search state defaults');
      resetSearchStateDefaults();
      isFirstMount = false;
    }
  }, []);

  // Track active tab changes to detect tab navigation
  useEffect(() => {
    // If we're coming back to the notes tab from somewhere else
    if (
      currentActiveTab === 'notes' &&
      previousTab !== 'notes' &&
      previousTab !== null
    ) {
      console.log(
        'Returned to notes tab from another tab, wasOnSearch:',
        wasOnSearch
      );

      // Only activate search if the user was previously on the search tab when they left
      if (wasOnSearch) {
        // If wasOnSearch is true, we keep isSearchActive true
        // This happens automatically because the state is maintained in memory
        console.log(
          'Restoring search state because user was previously on search'
        );
      } else {
        // If wasOnSearch is false, ensure we're not showing search
        if (isSearchActive) {
          console.log(
            'Ensuring search is not active because user was not on search before'
          );
          setSearchActive(false);
        }
      }
    }

    setPreviousTab(currentActiveTab);
  }, [currentActiveTab, previousTab, wasOnSearch, isSearchActive]);

  // Log for debugging
  console.log('NotesTab rendering, isSearchActive:', isSearchActive);

  useEffect(() => {
    console.log('NotesTab effect running, isSearchActive:', isSearchActive);
  }, [isSearchActive]);

  if (isSearchActive) {
    console.log('Rendering SearchTab component');
    return <SearchTab />;
  } else {
    console.log('Rendering NotesTabContent component');
    return <NoteTabContent />;
  }
};

export const NoteTab = observer(NoteTabComponent);
