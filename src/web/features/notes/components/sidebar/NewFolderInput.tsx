import React, { useEffect, useRef, useImperativeHandle, useState } from 'react';
import { FiFolder } from 'react-icons/fi';

// UI Components
import { Input } from '@/components/ui/input';

// Define a handle type to expose methods to the parent
export interface NewFolderInputHandle {
  focusInput: () => void;
}

interface NewFolderInputProps {
  name: string;
  level: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onBlur: () => void;
}

// Use forwardRef to properly handle the ref from the parent
const NewFolderInputComponent = React.forwardRef<
  NewFolderInputHandle,
  NewFolderInputProps
>(({ name, level, onChange, onKeyDown, onBlur }, ref) => {
  const indentStyle = { paddingLeft: `${level * 12 + 8}px` };
  const blurTimeoutRef = useRef<number | null>(null);
  const focusAttemptsRef = useRef<number>(0);

  // Track the input element with state
  const [inputElement, setInputElement] = useState<HTMLInputElement | null>(
    null
  );

  // State to track if user is actively editing
  const [isEditing, setIsEditing] = useState(false);
  // State to track if component was just mounted
  const [isJustMounted, setIsJustMounted] = useState(true);

  // Track the last time we focused
  const lastFocusTimeRef = useRef<number>(0);

  // Expose methods to the parent component via ref
  useImperativeHandle(
    ref,
    () => ({
      focusInput: () => {
        // Don't interrupt if the user is actively editing
        if (isEditing) {
          return true;
        }

        focusAttemptsRef.current += 1;
        console.log(
          `Focus attempt ${focusAttemptsRef.current} for folder input level ${level}`
        );

        // Don't focus again if we just focused recently (within 500ms)
        const now = Date.now();
        if (
          now - lastFocusTimeRef.current < 500 &&
          focusAttemptsRef.current > 3
        ) {
          return true;
        }

        if (inputElement) {
          inputElement.focus();
          inputElement.select();
          lastFocusTimeRef.current = now;
          setIsEditing(true); // Set editing state when we explicitly focus
          return true;
        }

        // If inputElement is not available, try using document.querySelector as fallback
        const foundElement = document.querySelector(
          `.folder-input-level-${level}`
        ) as HTMLInputElement;

        if (foundElement) {
          foundElement.focus();
          foundElement.select();
          lastFocusTimeRef.current = now;
          setIsEditing(true); // Set editing state when we explicitly focus
          return true;
        }

        return false;
      },
    }),
    [inputElement, level, isEditing]
  );

  // Handle new text input
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Mark that user is actively editing
    setIsEditing(true);
    // Call the parent's onChange handler to update state
    onChange(e);
  };

  // Prevent immediate blur when pressing Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Mark that user is actively editing
    setIsEditing(true);

    if (e.key === 'Enter') {
      // Cancel any scheduled blur timeout
      if (blurTimeoutRef.current !== null) {
        window.clearTimeout(blurTimeoutRef.current);
        blurTimeoutRef.current = null;
      }

      // Prevent default form submission behavior
      e.preventDefault();
    }

    // Call the parent's onKeyDown handler
    onKeyDown(e);
  };

  // Handle blur event with a slight delay to prevent race conditions
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Only process blur if we've been mounted for a while or user was actively editing
    if (!isJustMounted || isEditing) {
      // Mark that user is done editing
      setIsEditing(false);

      // Short delay to allow enter key handler to execute first if needed
      blurTimeoutRef.current = window.setTimeout(() => {
        onBlur();
      }, 100); // Increased delay slightly
    } else {
      // If we just mounted and haven't started editing, don't trigger blur handler yet
      console.log('Ignoring initial blur event');
      // Re-focus the input to prevent immediate blur after mount
      if (inputElement) {
        setTimeout(() => {
          if (inputElement) {
            inputElement.focus();
            inputElement.select();
          }
        }, 50);
      }
    }
  };

  // Focus and select text when component mounts
  useEffect(() => {
    // Try to focus immediately
    if (inputElement) {
      inputElement.focus();
      inputElement.select();
      lastFocusTimeRef.current = Date.now();
    }

    // After a moment, consider the component fully mounted
    const mountedTimer = setTimeout(() => {
      setIsJustMounted(false);
    }, 300);

    // Cleanup function
    return () => {
      if (blurTimeoutRef.current !== null) {
        window.clearTimeout(blurTimeoutRef.current);
      }
      clearTimeout(mountedTimer);
    };
  }, [inputElement]);

  // Handle input element ref
  const handleInputRef = (element: HTMLInputElement | null) => {
    setInputElement(element);
  };

  // Prevent click events from propagating and causing blur
  const handleContainerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      className="flex items-center px-2 py-1 mb-1"
      style={indentStyle}
      onClick={handleContainerClick}
    >
      <FiFolder
        className="mr-2 flex-shrink-0"
        size={14}
      />
      <Input
        ref={handleInputRef}
        type="text"
        value={name}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className={`h-7 text-base folder-input-level-${level}`}
        placeholder="Folder name"
        autoFocus
      />
    </div>
  );
});

// Set display name for debugging
NewFolderInputComponent.displayName = 'NewFolderInput';

export const NewFolderInput = NewFolderInputComponent;
