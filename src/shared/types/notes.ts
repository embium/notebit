/**
 * Types related to notes functionality
 */

export interface NoteSearchResult {
  id: string;
  title: string;
  path: string;
  preview?: string;
  score: number;
}

export interface NoteFile {
  id: string;
  title: string;
  path: string;
  isFolder: boolean;
  parentId: string | null;
  children?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface NotesState {
  /** List of all notes and folders */
  notesList: NoteFile[];

  /** Currently selected/open note */
  currentNote: {
    id: string | null;
    title: string;
    content: string;
    path: string | null;
    unsavedChanges: boolean;
  };

  /** Active tab in the application (notes or chats) */
  activeTab: 'chats' | 'notes';

  /** Loading state for async operations */
  isLoading: boolean;

  /**
   * When true, the NotesScreen title input should focus and select its text
   * This is set transiently when a new note is created
   */
  requestTitleInputFocus: boolean;

  /** Array of folder IDs that are currently expanded in the UI */
  expandedFolders: string[];

  /** The scroll position of the notes list */
  scrollPosition: number;
}

export interface SearchResultItem {
  id: string;
  title: string;
  path: string;
  preview?: string;
  score: number;
}

/**
 * Search mode type
 */
export type SearchMode = 'keyword' | 'semantic' | 'hybrid';
