import { useEffect, useState, useRef } from 'react';

// State
import {
  updateCurrentNoteTitle,
  setRequestTitleInputFocus,
} from '@/features/notes/state/notesState';
import { FocusPosition, RawCommands, SingleCommands } from '@tiptap/react';

/**
 * Custom hook for managing note title functionality
 *
 * @param initialTitle - Initial title value
 * @param shouldFocus - Whether the title input should be focused
 * @returns Object containing title state, handlers, and input ref
 */
export function useNoteTitle(
  initialTitle: string,
  shouldFocus: boolean,
  editorFocusCommand:
    | ((
        position?: FocusPosition | undefined,
        options?: { scrollIntoView?: boolean | undefined } | undefined
      ) => boolean)
    | undefined
) {
  const [title, setTitle] = useState(initialTitle);
  const [isEditing, setIsEditing] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Update title state when initialTitle changes
  useEffect(() => {
    setTitle(initialTitle);
  }, [initialTitle]);

  // Focus title input when flag is set
  useEffect(() => {
    if (shouldFocus && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
      setRequestTitleInputFocus(false); // Reset the focus flag
    }
  }, [shouldFocus]);

  // Handle title changes
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  };

  // Handle title blur (save title)
  const handleTitleBlur = () => {
    updateCurrentNoteTitle(title);
    setIsEditing(false);
  };

  // Handle title focus
  const handleTitleFocus = () => {
    setIsEditing(true);
  };

  // Handle title key down events
  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      // Save on Enter key
      titleInputRef.current?.blur();
      editorFocusCommand?.();
    }
  };

  return {
    title,
    isEditing,
    titleInputRef,
    handleTitleChange,
    handleTitleBlur,
    handleTitleFocus,
    handleTitleKeyDown,
  };
}
