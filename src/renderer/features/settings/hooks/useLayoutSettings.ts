import { useSelector } from '@legendapp/state/react';

// State
import { layoutSettingsState$ } from '@/features/settings/state/layoutSettingsState';

/**
 * Hook to access and update layout settings
 */
export function useLayoutSettings() {
  // Get values from state
  const middleSidebarWidth = useSelector(
    layoutSettingsState$.middleSidebarWidth
  );
  const notesTabScrollPosition = useSelector(
    layoutSettingsState$.notesTabScrollPosition
  );

  // Update functions
  const setMiddleSidebarWidth = (width: number) => {
    layoutSettingsState$.middleSidebarWidth.set(width);
  };

  const setNotesTabScrollPosition = (position: number) => {
    layoutSettingsState$.notesTabScrollPosition.set(position);
  };

  const updateLayoutSettings = (settings: {
    middleSidebarWidth?: number;
    notesTabScrollPosition?: number;
  }) => {
    if (settings.middleSidebarWidth !== undefined) {
      layoutSettingsState$.middleSidebarWidth.set(settings.middleSidebarWidth);
    }

    if (settings.notesTabScrollPosition !== undefined) {
      layoutSettingsState$.notesTabScrollPosition.set(
        settings.notesTabScrollPosition
      );
    }
  };

  return {
    // Values
    middleSidebarWidth,
    notesTabScrollPosition,

    // Update functions
    setMiddleSidebarWidth,
    setNotesTabScrollPosition,
    updateLayoutSettings,
  };
}
