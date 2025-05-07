import { useEffect, useState, useRef } from 'react';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import Link from '@tiptap/extension-link';

// State
import { setNoteContent } from '@/features/notes/state/notesState';

// Extensions
import { LaTeX } from '@/features/notes/extensions/latex';

// Utils
import { openExternalLink } from '@/shared/utils/linkHandler';

/**
 * Custom hook for managing the Tiptap editor in the Notes feature
 *
 * @param initialContent - Initial markdown content for the editor
 * @returns Object containing the editor instance and selected text
 */
export function useNoteEditor(initialContent: string) {
  const [selectedText, setSelectedText] = useState<string>('');
  const lastSavedContentRef = useRef<string>(initialContent);
  const editorContainerRef = useRef<HTMLDivElement | null>(null);

  // Initialize the editor
  const editor = useEditor({
    extensions: [
      StarterKit,
      Markdown.configure({
        html: false,
        tightLists: true,
        tightListClass: 'tight',
        bulletListMarker: '-',
        linkify: true,
      }),
      Link.configure({
        openOnClick: false, // Disable default handling so we can use our own
        linkOnPaste: true,
        HTMLAttributes: {
          class: 'text-primary underline',
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      LaTeX.configure({
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false },
        ],
      }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert max-w-none flex-1 h-full',
      },
    },
    onUpdate: async ({ editor }) => {
      // On editor content update, convert to markdown and update state
      if (editor) {
        const markdown = editor.storage.markdown.getMarkdown();

        // Only update state if content has actually changed
        if (markdown !== lastSavedContentRef.current) {
          lastSavedContentRef.current = markdown;
          await setNoteContent(markdown);
        }
      }
    },
    onSelectionUpdate: ({ editor }) => {
      // When selection changes, capture the selected text for context menu actions
      if (editor.state.selection.empty) {
        setSelectedText('');
      } else {
        // Get the selected text
        const { from, to } = editor.state.selection;
        const text = editor.state.doc.textBetween(from, to, ' ');
        setSelectedText(text);
      }
    },
  });

  // Update editor content ONLY when initialContent changes from external sources
  // not as a result of our own editing
  useEffect(() => {
    if (editor && initialContent !== lastSavedContentRef.current) {
      editor.commands.setContent(initialContent);
      lastSavedContentRef.current = initialContent;
    }
  }, [initialContent, editor]);

  // Set up custom link handling
  useEffect(() => {
    if (!editor) return;

    // Get the editor's DOM element
    const editorElement = editor.view.dom;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');

      if (link && link.href && !link.href.startsWith('javascript:')) {
        e.preventDefault();
        openExternalLink(link.href);
      }
    };

    editorElement.addEventListener('click', handleClick);
    return () => {
      editorElement.removeEventListener('click', handleClick);
    };
  }, [editor]);

  return {
    editor,
    selectedText,
    editorContainerRef,
  };
}
