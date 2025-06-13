import React from 'react';
import { Editor } from '@tiptap/react';
import {
  FaParagraph,
  FaBold,
  FaItalic,
  FaStrikethrough,
  FaListUl,
  FaListOl,
  FaCode,
  FaQuoteLeft,
} from 'react-icons/fa';

// UI Components
import { Button } from '@/components/ui/button';

interface MenuBarProps {
  editor: Editor | null;
}

/**
 * Menu bar component for Tiptap editor
 * Provides formatting controls for the rich text editor
 */
export const MenuBar: React.FC<MenuBarProps> = ({ editor }) => {
  if (!editor) {
    return null;
  }

  return (
    <div className="flex justify-center overflow-x-auto p-1 border-b">
      <Button
        variant="ghost"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={editor.isActive('heading', { level: 1 }) ? 'bg-muted' : ''}
        size="sm"
      >
        <span className="font-bold">H1</span>
      </Button>
      <Button
        variant="ghost"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={editor.isActive('heading', { level: 2 }) ? 'bg-muted' : ''}
        size="sm"
      >
        <span className="font-bold">H2</span>
      </Button>
      <Button
        variant="ghost"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={editor.isActive('heading', { level: 3 }) ? 'bg-muted' : ''}
        size="sm"
      >
        <span className="font-bold">H3</span>
      </Button>
      <Button
        variant="ghost"
        onClick={() => editor.chain().focus().setParagraph().run()}
        className={editor.isActive('paragraph') ? 'bg-muted' : ''}
        size="sm"
      >
        <FaParagraph className="h-4 w-4" />
      </Button>
      <div className="h-6 border-l mx-1"></div>
      <Button
        variant="ghost"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={editor.isActive('bold') ? 'bg-muted' : ''}
        size="sm"
      >
        <FaBold className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={editor.isActive('italic') ? 'bg-muted' : ''}
        size="sm"
      >
        <FaItalic className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={editor.isActive('strike') ? 'bg-muted' : ''}
        size="sm"
      >
        <FaStrikethrough className="h-4 w-4" />
      </Button>
      <div className="h-6 border-l mx-1"></div>
      <Button
        variant="ghost"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={editor.isActive('bulletList') ? 'bg-muted' : ''}
        size="sm"
      >
        <FaListUl className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={editor.isActive('orderedList') ? 'bg-muted' : ''}
        size="sm"
      >
        <FaListOl className="h-4 w-4" />
      </Button>
      <div className="h-6 border-l mx-1"></div>
      <Button
        variant="ghost"
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        className={editor.isActive('codeBlock') ? 'bg-muted' : ''}
        size="sm"
      >
        <FaCode className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={editor.isActive('blockquote') ? 'bg-muted' : ''}
        size="sm"
      >
        <FaQuoteLeft className="h-4 w-4" />
      </Button>
    </div>
  );
};
