import React, { useCallback, useMemo, useState } from 'react';
import { Message } from '@shared/types/chats';
import { FiFile, FiFolder } from 'react-icons/fi';
import { toast } from 'sonner';

// Components
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';

// Utils
import { extractTextContent } from '@/features/chats/utils/messageUtils';

// Services
import { NoteFile } from '@shared/services/notesFileService';
import { observer } from '@legendapp/state/react';

interface MessageContextMenuProps {
  isUser: boolean;
  message: Message;
  children: React.ReactNode;
  notes: NoteFile[];
  selectedText: string;
  onEditMessage?: (messageId: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onSaveSelectionAsNote: (content: string, notePath?: string) => void;
  onAppendSelectionToNote: (noteId: string, content: string) => void;
  onSaveMessageAsNote: (content: string, notePath?: string) => void;
  onAppendMessageToNote: (noteId: string, content: string) => void;
}

/**
 * Context menu for message items providing actions like saving to notes and editing
 */
const MessageContextMenuComponent: React.FC<MessageContextMenuProps> = ({
  isUser,
  message,
  children,
  notes,
  selectedText,
  onEditMessage,
  onDeleteMessage,
  onSaveSelectionAsNote,
  onAppendSelectionToNote,
  onSaveMessageAsNote,
  onAppendMessageToNote,
}) => {
  // Extract text content for actions
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
  const textContent = extractTextContent(message);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(textContent).catch((error) => {
      console.error('Error copying message:', error);
      toast.error('Failed to copy message');
    });
  }, [textContent]);

  const handleCopySelection = useCallback(() => {
    if (selectedText) {
      navigator.clipboard.writeText(selectedText).catch((error) => {
        console.error('Error copying selection:', error);
        toast.error('Failed to copy selection');
      });
    }
  }, [selectedText]);

  // Memoize and defer computation of the note tree structure until needed
  const notesTree = useMemo(() => {
    // Skip expensive computation if context menu isn't open
    if (!isContextMenuOpen) return {};

    const treeData: Record<string, NoteFile[]> = {};

    // Group notes by parent ID
    notes.forEach((note) => {
      const parentId = note.parentId || 'root';
      if (!treeData[parentId]) {
        treeData[parentId] = [];
      }
      treeData[parentId].push(note);
    });

    // Sort each group alphabetically, folders first
    Object.keys(treeData).forEach((parentId) => {
      treeData[parentId].sort((a: NoteFile, b: NoteFile) => {
        // Sort by type (folders first) then by title
        if (a.isFolder !== b.isFolder) {
          return a.isFolder ? -1 : 1;
        }

        // Then by title
        const compare = (a: NoteFile, b: NoteFile) =>
          a.title.localeCompare(b.title, undefined, {
            numeric: true,
            sensitivity: 'base',
          });
        return compare(a, b);
      });
    });

    return treeData;
  }, [notes, isContextMenuOpen]);

  // Lazily render the tree items only when needed
  const LazyTreeItems = useCallback(
    ({
      parentId,
      forSelection,
    }: {
      parentId: string;
      forSelection: boolean;
    }) => {
      const items = notesTree[parentId] || [];

      if (items.length === 0) return null;

      return (
        <>
          {items.map((item) => {
            if (item.isFolder) {
              return (
                <ContextMenuSub key={item.id}>
                  <ContextMenuSubTrigger>
                    <FiFolder
                      className="mr-2"
                      size={14}
                    />
                    {item.title}
                  </ContextMenuSubTrigger>
                  <ContextMenuSubContent className="overflow-y-auto max-h-56 scrollbar-visible">
                    <ContextMenuItem
                      onClick={() =>
                        forSelection
                          ? onSaveSelectionAsNote(selectedText, item.path)
                          : onSaveMessageAsNote(textContent, item.path)
                      }
                    >
                      <FiFile
                        className="mr-2"
                        size={14}
                      />
                      New note in {item.title}
                    </ContextMenuItem>
                    <ContextMenuSeparator />

                    {/* Child notes in this folder */}

                    {/* Subfolders - Using LazyTreeItems for recursive rendering */}
                    <LazyTreeItems
                      parentId={item.id}
                      forSelection={forSelection}
                    />
                  </ContextMenuSubContent>
                </ContextMenuSub>
              );
            } else {
              return (
                <ContextMenuItem
                  key={item.id}
                  onClick={() =>
                    forSelection
                      ? onAppendSelectionToNote(item.id, selectedText)
                      : onAppendMessageToNote(item.id, textContent)
                  }
                >
                  <FiFile
                    className="mr-2"
                    size={14}
                  />
                  {item.title}
                </ContextMenuItem>
              );
            }
          })}
        </>
      );
    },
    [
      notesTree,
      onSaveSelectionAsNote,
      onSaveMessageAsNote,
      onAppendSelectionToNote,
      onAppendMessageToNote,
    ]
  );

  return (
    <ContextMenu onOpenChange={setIsContextMenuOpen}>
      <ContextMenuTrigger>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={handleCopy}>Copy message</ContextMenuItem>

        {!isUser && selectedText && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={handleCopySelection}>
              Copy selection
            </ContextMenuItem>

            <ContextMenuSub>
              <ContextMenuSubTrigger>
                Save selection to note
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="overflow-y-auto max-h-56 scrollbar-visible">
                <ContextMenuItem
                  onClick={(e) => onSaveSelectionAsNote(selectedText)}
                >
                  <FiFile
                    className="mr-2"
                    size={14}
                  />
                  New note (root)
                </ContextMenuItem>
                {notes.filter((note) => !note.isFolder && !note.parentId)
                  .length > 0 && <ContextMenuSeparator />}

                {isContextMenuOpen && (
                  <LazyTreeItems
                    parentId="root"
                    forSelection={true}
                  />
                )}
              </ContextMenuSubContent>
            </ContextMenuSub>
          </>
        )}

        {!isUser && (
          <>
            <ContextMenuSeparator />
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                Save entire message to notes
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="overflow-y-auto max-h-56 scrollbar-visible">
                <ContextMenuItem
                  onClick={(e) => onSaveMessageAsNote(textContent)}
                >
                  <FiFile
                    className="mr-2"
                    size={14}
                  />
                  New note (root)
                </ContextMenuItem>
                {notes.filter((note) => !note.isFolder && !note.parentId)
                  .length > 0 && <ContextMenuSeparator />}

                {isContextMenuOpen && (
                  <LazyTreeItems
                    parentId="root"
                    forSelection={false}
                  />
                )}
              </ContextMenuSubContent>
            </ContextMenuSub>
          </>
        )}

        <ContextMenuSeparator />

        {isUser && (
          <ContextMenuItem onClick={(e) => onEditMessage?.(message.id)}>
            Edit message
          </ContextMenuItem>
        )}

        <ContextMenuItem
          onClick={(e) => onDeleteMessage?.(message.id)}
          className="text-red-500"
        >
          Delete message
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};

export const MessageContextMenu = observer(MessageContextMenuComponent);
