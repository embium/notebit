import { observable, computed } from '@legendapp/state';
import { persistObservable } from '@legendapp/state/persist';
import { useSelector } from '@legendapp/state/react';

// Types
import { LayoutSettings } from '@src/types/settings';

// Create the initial state
const initialState: LayoutSettings = {
  middleSidebarWidth: 415,
  notesTabScrollPosition: 0,
};

// Create the observable state
export const layoutSettingsState$ = observable<LayoutSettings>(initialState);

// Setup persistence
persistObservable(layoutSettingsState$, {
  local: 'layout-state',
});

// Computed values
export const middleSidebarWidth = computed(() =>
  layoutSettingsState$.middleSidebarWidth.get()
);

export const notesTabScrollPosition = computed(() =>
  layoutSettingsState$.notesTabScrollPosition.get()
);

// Set the middle sidebar width with constraints
export function setMiddleSidebarWidth(width: number) {
  // Constrain width to valid range
  const newWidth = Math.max(180, Math.min(width, 1200));
  console.log('newWidth', newWidth);

  // Update the state
  layoutSettingsState$.middleSidebarWidth.set(newWidth);
}

export function setNotesTabScrollPosition(position: number) {
  layoutSettingsState$.notesTabScrollPosition.set(position);
}

// Hook to access layout state values with Legend State
export function useLayoutState() {
  const middleSidebarWidth = useSelector(
    layoutSettingsState$.middleSidebarWidth
  );
  const notesTabScrollPosition = useSelector(
    layoutSettingsState$.notesTabScrollPosition
  );

  return {
    middleSidebarWidth,
    notesTabScrollPosition,
    setMiddleSidebarWidth,
    setNotesTabScrollPosition,
  };
}
