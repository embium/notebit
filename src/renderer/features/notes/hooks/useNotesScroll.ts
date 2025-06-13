import { useCallback, useRef, useEffect } from 'react';
import { debounce } from 'lodash';

// State
import {
  findNextAvailableUntitledName,
  notesState$,
} from '@/features/notes/state/notesState';
import { layoutSettingsState$ } from '@/features/settings/state/layoutSettingsState';

/**
 * Hook for handling scroll operations in the notes tree
 */
export function useNotesScroll() {
  const notesListValue = notesState$.notesList.get();
  const expandedFoldersValue = notesState$.expandedFolders.get();
  const currentScrollPosition =
    layoutSettingsState$.notesTabScrollPosition.get();
  const notesAreaRef = useRef<HTMLDivElement>(null);

  // Set scroll position when it changes
  const saveScrollPosition = useCallback(
    debounce((position: number) => {
      layoutSettingsState$.notesTabScrollPosition.set(position);
    }, 150),
    []
  );

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const scrollTop = e.currentTarget.scrollTop;
      saveScrollPosition(scrollTop);
    },
    [saveScrollPosition]
  );

  // Apply saved scroll position when component mounts
  useEffect(() => {
    if (notesAreaRef.current) {
      notesAreaRef.current.scrollTop = currentScrollPosition;
    }
  }, [currentScrollPosition]);

  /**
   * Function to scroll to a specific file or folder element
   */
  const scrollToItem = useCallback(
    (itemPath: string) => {
      if (!notesAreaRef.current) return;

      // Use a longer timeout to ensure DOM has fully updated
      setTimeout(() => {
        console.log('Attempting to scroll to:', itemPath);

        if (!notesAreaRef.current) {
          console.log('Notes area ref is null');
          return;
        }

        // Escape any special characters in the path for the selector
        const escapedPath = itemPath
          .replace(/\\/g, '\\\\')
          .replace(/"/g, '\\"');
        const fileSelector = `[data-file-path="${escapedPath}"]`;
        const folderSelector = `[data-folder-path="${escapedPath}"]`;

        console.log(
          'Looking for selectors:',
          fileSelector,
          'or',
          folderSelector
        );

        const element =
          notesAreaRef.current.querySelector(fileSelector) ||
          notesAreaRef.current.querySelector(folderSelector);

        console.log('Found element:', element);

        if (element) {
          // Calculate the element's position relative to the scroll container
          const containerRect = notesAreaRef.current.getBoundingClientRect();
          const elementRect = element.getBoundingClientRect();

          console.log('Container rect:', containerRect);
          console.log('Element rect:', elementRect);

          // Calculate the scroll position needed to bring the element into view
          const scrollTop =
            notesAreaRef.current.scrollTop +
            (elementRect.top - containerRect.top) -
            containerRect.height / 4; // Position it at 1/4 of the container height

          console.log('Scrolling to position:', scrollTop);

          // Scroll to the position
          notesAreaRef.current.scrollTo({
            top: scrollTop,
            behavior: 'smooth',
          });

          // Update the stored scroll position
          saveScrollPosition(scrollTop);
        } else {
          console.log('Element not found');
        }
      }, 100); // Increased timeout to give DOM more time to update
    },
    [saveScrollPosition]
  );

  /**
   * Helper function to expand all parent folders of a path
   */
  const expandParentFolders = useCallback(
    (path: string) => {
      // Find all parent folders that need to be expanded
      const pathParts = path.split('\\');
      pathParts.pop(); // Remove the file name

      if (pathParts.length === 0) return; // No parent folders

      // Build paths for all parent folders
      let currentPath = '';
      const parentPaths: string[] = [];

      for (let i = 0; i < pathParts.length; i++) {
        if (i === 0) {
          currentPath = pathParts[i];
        } else {
          currentPath = `${currentPath}\\${pathParts[i]}`;
        }
        parentPaths.push(currentPath);
      }

      // Find folder IDs for all parent paths
      const folderIdsToExpand = notesListValue
        .filter((note) => note.isFolder && parentPaths.includes(note.path))
        .map((folder) => folder.id);

      // Add these IDs to expanded folders if not already there
      const newExpandedFolders = [...expandedFoldersValue];
      let hasChanges = false;

      folderIdsToExpand.forEach((id) => {
        if (!newExpandedFolders.includes(id)) {
          newExpandedFolders.push(id);
          hasChanges = true;
        }
      });

      if (hasChanges) {
        notesState$.expandedFolders.set(newExpandedFolders);
      }
    },
    [notesListValue, expandedFoldersValue]
  );

  const scrollToNewFolderInput = useCallback((inputRef: any) => {
    if (inputRef) {
      // For HTML input elements
      if (inputRef instanceof HTMLInputElement) {
        // Ensure the element is visible
        inputRef.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Focus and select the input
        inputRef.focus();
        inputRef.select();
      }
    }
  }, []);

  return {
    notesAreaRef,
    handleScroll,
    scrollToItem,
    expandParentFolders,
    scrollToNewFolderInput,
  };
}
