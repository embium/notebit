import React, { useEffect, useRef, useImperativeHandle, useState } from 'react';
import { FiFolder } from 'react-icons/fi';

// UI Components
import { Input } from '@/components/ui/input';
import { ChevronRight } from 'lucide-react';

interface NewFolderInputProps {
  name: string;
  level: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onBlur: () => void;
  newFolderInputRef: React.RefObject<HTMLInputElement>;
}

// Use forwardRef to properly handle the ref from the parent
const NewFolderInputComponent: React.FC<NewFolderInputProps> = ({
  name,
  level,
  onChange,
  onKeyDown,
  onBlur,
  newFolderInputRef,
}) => {
  const indentStyle = { paddingLeft: `${level * 12 + 8}px` };

  const [isEditing, setIsEditing] = useState(false);

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
      // Prevent default form submission behavior
      e.preventDefault();
    }

    // Call the parent's onKeyDown handler
    onKeyDown(e);
  };

  // Handle blur event with a slight delay to prevent race conditions
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Only process blur if we've been mounted for a while or user was actively editing
    if (isEditing) {
      setIsEditing(false);
      setTimeout(() => {
        onBlur();
      }, 50);
    }
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
      <ChevronRight
        className="mr-2 flex-shrink-0"
        size={14}
      />
      <input
        ref={newFolderInputRef}
        type="text"
        value={name}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className={`w-full px-2 py-1 bg-background border border-input rounded-md folder-input-level-${level}`}
        placeholder="Folder name"
        autoFocus
      />
    </div>
  );
};

// Set display name for debugging
NewFolderInputComponent.displayName = 'NewFolderInput';

export const NewFolderInput = NewFolderInputComponent;
