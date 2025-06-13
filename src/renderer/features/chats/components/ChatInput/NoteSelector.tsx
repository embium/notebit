import React, { useCallback } from 'react';
import { FiChevronDown, FiFolder } from 'react-icons/fi';
import { observer } from '@legendapp/state/react';

// UI Components
import { CustomDropdown } from '@/components/custom/CustomDropdown';
import {
  CustomDropdownItem,
  CustomDropdownLabel,
  CustomDropdownSeparator,
  CustomDropdownSub,
  CustomDropdownSubTrigger,
  CustomDropdownSubContent,
} from '@/components/custom/CustomDropdownItem';
import { Button } from '@/components/ui/button';

// Services
import { NoteFile } from '@src/shared/services/notesFileService';

interface NoteSelectorProps {
  rootNotes: NoteFile[];
  folderStructure: Map<string | null, NoteFile[]>;
  fileStructure: Map<string | null, NoteFile[]>;
  onSelectNote: (noteId: string) => void;
  hasNotes: boolean;
}

/**
 * Component for selecting notes to add to chat input
 */
const NoteSelectorComponent: React.FC<NoteSelectorProps> = ({
  rootNotes,
  folderStructure,
  fileStructure,
  onSelectNote,
  hasNotes,
}) => {
  // Render root-level notes
  const renderNoteItems = useCallback(() => {
    return (
      <>
        {rootNotes.map((note) => (
          <CustomDropdownItem
            key={String(note.id)}
            onClick={() => onSelectNote(note.id)}
          >
            {String(note.title)}
          </CustomDropdownItem>
        ))}
      </>
    );
  }, [rootNotes, onSelectNote]);

  // Recursively render folder structure with notes
  const renderFolderSubmenus = useCallback(
    (parentId: string | null = null) => {
      const folders = folderStructure.get(parentId) || [];
      return [
        ...folders.map((folder) => (
          <CustomDropdownSub key={folder.id}>
            <CustomDropdownSubTrigger>
              <FiFolder
                className="mr-2"
                size={14}
              />
              {folder.title}
            </CustomDropdownSubTrigger>
            <CustomDropdownSubContent className="w-56 overflow-y-auto">
              {/* Notes in this folder */}
              {(fileStructure.get(folder.id) || []).map((note) => (
                <CustomDropdownItem
                  key={note.id}
                  onClick={() => onSelectNote(note.id)}
                >
                  {note.title}
                </CustomDropdownItem>
              ))}
              {/* Recurse into subfolders */}
              {renderFolderSubmenus(folder.id)}
            </CustomDropdownSubContent>
          </CustomDropdownSub>
        )),
      ];
    },
    [folderStructure, fileStructure, onSelectNote]
  );

  return (
    <CustomDropdown
      className="w-[220px]"
      trigger={
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-between"
        >
          <span className="truncate">Add a note</span>
          <FiChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      }
      contentClassName="w-[220px]"
      persistOnItemClick={true}
      maxHeight={300}
    >
      <CustomDropdownLabel>Available Notes</CustomDropdownLabel>
      <CustomDropdownSeparator />
      {!hasNotes ? (
        <CustomDropdownItem disabled>No notes available</CustomDropdownItem>
      ) : (
        <>
          {renderNoteItems()}
          {renderFolderSubmenus()}
        </>
      )}
    </CustomDropdown>
  );
};

export const NoteSelector = observer(NoteSelectorComponent);
