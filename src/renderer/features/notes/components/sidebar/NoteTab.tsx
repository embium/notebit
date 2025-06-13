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
} from '@/features/notes/state/notesState';
import {
  searchState$,
  setSearchActive,
  resetSearchStateDefaults,
} from '@/features/notes/state/searchState';

// Static flag to track if this is the first component mount after app start
let isFirstMount = true;

/**
 * Header component for the notes tab
 */
const NoteTabHeaderComponent: React.FC = () => {
  const isSearchActive = searchState$.isSearchActive.get();

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
      // Only activate search if the user was previously on the search tab when they left
      if (!wasOnSearch) {
        if (isSearchActive) {
          setSearchActive(false);
        }
      }
    }

    setPreviousTab(currentActiveTab);
  }, [currentActiveTab, previousTab, wasOnSearch, isSearchActive]);

  useEffect(() => {}, [isSearchActive]);

  if (isSearchActive) {
    return <SearchTab />;
  } else {
    return <NoteTabContent />;
  }
};

export const NoteTab = observer(NoteTabComponent);
