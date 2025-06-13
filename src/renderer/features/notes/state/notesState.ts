/**
 * Notes feature state management with Legend State
 *
 * This file manages the entire state for the Notes feature including:
 * - Note listing and hierarchy
 * - Current note selection and editing
 * - UI state (scroll position, expanded folders, etc.)
 */

// -------------------------------------------------------------------------
// Imports
// -------------------------------------------------------------------------
import { observable, computed } from '@legendapp/state';
import { persistObservable } from '@legendapp/state/persist';
import { debounce } from 'lodash';

import { trpcProxyClient } from '@shared/config/index';
import { NoteFile } from '@src/types/notes';
import { generateEmbedding } from '@src/renderer/lib/ai/embeddingUtils';

// -------------------------------------------------------------------------
// Types and Interfaces
// -------------------------------------------------------------------------

/**
 * Interface for the Notes feature state
 */
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

// -------------------------------------------------------------------------
// State Initialization
// -------------------------------------------------------------------------

/**
 * Initial state for the Notes feature
 */
const initialState: NotesState = {
  notesList: [],
  currentNote: {
    id: null,
    title: '',
    content: '',
    path: null,
    unsavedChanges: false,
  },
  activeTab: 'chats',
  isLoading: false,
  requestTitleInputFocus: false,
  expandedFolders: [],
  scrollPosition: 0,
};

/**
 * Observable state for the Notes feature
 */
export const notesState$ = observable<NotesState>(initialState);

/**
 * Setup persistence for notes state
 */
persistObservable(notesState$, {
  local: 'notes-state',
});

// -------------------------------------------------------------------------
// Computed Selectors
// -------------------------------------------------------------------------

/**
 * Get the list of all notes and folders
 */
export const notesList = computed(() => notesState$.notesList.get());

/**
 * Get the currently selected note
 */
export const currentNote = computed(() => notesState$.currentNote.get());

/**
 * Get the active tab (notes or chats)
 */
export const activeTab = computed(() => notesState$.activeTab.get());

/**
 * Get the loading state
 */
export const isLoading = computed(() => notesState$.isLoading.get());

/**
 * Check if title input focus is requested
 */
export const requestTitleInputFocus = computed(() =>
  notesState$.requestTitleInputFocus.get()
);

/**
 * Get the list of expanded folder IDs
 */
export const expandedFolders = computed(() =>
  notesState$.expandedFolders.get()
);

/**
 * Get the current scroll position of the notes list
 */
export const scrollPosition = computed(() => notesState$.scrollPosition.get());

// -------------------------------------------------------------------------
// Helper Functions
// -------------------------------------------------------------------------

/**
 * Find the next available untitled note name
 * If "Untitled Note" exists, returns "Untitled Note 1", etc.
 */
export const findNextAvailableUntitledName = (forFolder: boolean): string => {
  const baseTitle = 'Untitled';
  let counter = 1;
  let newTitle = baseTitle;

  // Get all existing note titles
  const existingNotes = notesState$.notesList.get().map((note: NoteFile) => {
    return { isFolder: note.isFolder, title: note.title };
  });

  // Keep incrementing until we find an available name
  while (
    existingNotes.some(
      (note) => note.title === newTitle && note.isFolder === forFolder
    )
  ) {
    newTitle = `${baseTitle} ${counter}`;
    counter++;
  }

  return newTitle;
};

/**
 * Handle errors in async operations with consistent error logging and toast
 * @param operation - The operation that failed (for user-friendly messages)
 * @param error - The error that occurred
 * @param customMessage - Optional custom message to display instead of the default
 */
const handleError = (
  operation: string,
  error: unknown,
  customMessage?: string
): void => {
  console.error(`Error ${operation}:`, error);
};

/**
 * Convert string dates to Date objects in a NoteFile object
 * @param note - The note with potential string dates
 * @returns NoteFile with proper Date objects
 */
const convertNoteDates = (note: any): NoteFile => {
  return {
    ...note,
    createdAt:
      note.createdAt instanceof Date
        ? note.createdAt
        : new Date(note.createdAt),
    updatedAt:
      note.updatedAt instanceof Date
        ? note.updatedAt
        : new Date(note.updatedAt),
  } as NoteFile;
};

// -------------------------------------------------------------------------
// Core Note Operations
// -------------------------------------------------------------------------

/**
 * Initialize notes - can be called at app startup
 */
export async function initializeNotes(): Promise<void> {
  await loadNotes();

  // Start preloading notes for search in the background after notes are loaded
  setTimeout(() => {
    console.log('Starting background preload of notes for search');
    trpcProxyClient.notes.preloadNotesForSearch.mutate().catch((error) => {
      console.error('Error preloading notes for search:', error);
    });
  }, 2000); // Small delay to allow initial UI to render

  await initializeFileSystemWatcher();
}

/**
 * Load all notes from the backend
 */
export async function loadNotes(): Promise<void> {
  try {
    // Check if we can initialize the notes directory
    try {
      await trpcProxyClient.notes.initialize.mutate();
    } catch (err) {
      console.warn(
        'Notes initialization error (may be normal on first load):',
        err
      );
    }

    // Get all notes
    const notes = await trpcProxyClient.notes.getAll.query();

    // Make sure the notes list has the correct types for dates
    const typedNotes: NoteFile[] = notes.map((note) => ({
      ...note,
      createdAt: new Date(note.createdAt),
      updatedAt: new Date(note.updatedAt),
    }));

    notesState$.notesList.set(typedNotes);
  } catch (error) {
    handleError('loading notes', error);
  } finally {
    notesState$.isLoading.set(false);
  }
}

/**
 * Create a new note
 * @param params - Parameters for creating a note
 * @returns The newly created note or null if creation failed
 */
export async function createNote(params: {
  title?: string;
  parentPath?: string;
}): Promise<NoteFile | null> {
  const { title, parentPath } = params;
  notesState$.isLoading.set(true);

  try {
    // If no title is provided or it's empty, generate a unique untitled name
    const noteTitle = title || findNextAvailableUntitledName(false);

    // Only prevent duplicate note titles within the same parent, and only among notes
    const notesInParent = notesState$.notesList
      .get()
      .filter(
        (note) => note.parentId === (parentPath || null) && !note.isFolder
      );

    const duplicateNote = notesInParent.some(
      (note) => note.title === noteTitle
    );

    if (duplicateNote) {
      return null;
    }

    const newNoteResponse = await trpcProxyClient.notes.createNote.mutate({
      title: noteTitle,
      content: '',
      parentPath: parentPath || '',
    });

    // Convert the response to a properly typed NoteFile
    const newNote = convertNoteDates(newNoteResponse);

    // Reload the notes list
    await loadNotes();

    // Set the new note as the current note
    await openNote(newNote.path);

    // Set the focus flag to true so the title input gets focused
    notesState$.requestTitleInputFocus.set(true);

    return newNote;
  } catch (error) {
    handleError('creating note', error);
    return null;
  } finally {
    notesState$.isLoading.set(false);
  }
}

/**
 * Open a note by path
 * @param notePath - The path of the note to open
 */
export async function openNote(notePath: string): Promise<void> {
  notesState$.isLoading.set(true);

  try {
    // First save any unsaved changes in the current note
    await saveCurrentNote();

    // Get the note content
    const content = await trpcProxyClient.notes.getContent.query(notePath);

    // Find the note metadata in the list
    const notesListValue = notesState$.notesList.get();
    const note = notesListValue.find((n) => n.path === notePath);

    if (note) {
      notesState$.currentNote.set({
        id: note.id,
        title: note.title,
        content: content,
        path: notePath,
        unsavedChanges: false,
      });
    }
  } catch (error) {
    handleError('opening note', error);
  } finally {
    notesState$.isLoading.set(false);
  }
}

/**
 * Update the title of the current note
 * @param newTitle - The new title for the note
 */
export async function updateCurrentNoteTitle(newTitle: string): Promise<void> {
  // Don't allow empty titles
  if (!newTitle || newTitle.trim() === '') {
    newTitle = findNextAvailableUntitledName(false);
  }

  // Get the current path and check if we need to update on server
  const currentNoteValue = notesState$.currentNote.get();
  const currentPath = currentNoteValue.path;

  // If no path yet, just update the local title state
  if (!currentPath) {
    // Creating a new note - only for unsaved notes
    notesState$.currentNote.title.set(newTitle);
    return;
  }

  try {
    notesState$.isLoading.set(true);

    // Rename the file on the server
    await trpcProxyClient.notes.updateTitle.mutate({
      notePath: currentPath,
      newTitle: newTitle,
    });

    // Reload notes to get updated path
    await loadNotes();

    // Find the renamed note in the updated list
    const updatedNotesList = notesState$.notesList.get();
    const renamedNote = updatedNotesList.find((n) => n.title === newTitle);

    if (renamedNote) {
      // Update the current note with the new path and title
      const updatedNote = {
        ...currentNoteValue,
        id: renamedNote.id, // Ensure we use the new note ID
        title: newTitle,
        path: renamedNote.path,
      };

      // Update the entire note object first
      notesState$.currentNote.set(updatedNote);
    }
  } catch (error) {
    handleError('renaming note', error);
  } finally {
    notesState$.isLoading.set(false);
  }
}

/**
 * Delete a note by path
 * @param notePath - The path of the note to delete
 */
export async function deleteNote(notePath: string): Promise<void> {
  notesState$.isLoading.set(true);

  try {
    await trpcProxyClient.notes.delete.mutate(notePath);

    // Clear the current note if it's the one being deleted
    const currentNoteValue = notesState$.currentNote.get();
    if (currentNoteValue.path === notePath) {
      notesState$.currentNote.set(initialState.currentNote);
    }

    // Reload the notes list
    await loadNotes();
  } catch (error) {
    handleError('deleting note', error);
  } finally {
    notesState$.isLoading.set(false);
  }
}

/**
 * Get content for a specific note by ID
 * @param noteId - The ID of the note to get content for
 * @returns The content of the note or an empty string if not found
 */
export async function getContent(noteId: string): Promise<string> {
  try {
    // Find the note in the list
    const notesListValue = notesState$.notesList.get();
    const note = notesListValue.find((n) => n.id === noteId);

    if (!note || !note.path) {
      return '';
    }

    // Get the content
    return await trpcProxyClient.notes.getContent.query(note.path);
  } catch (error) {
    handleError('getting note content', error);
    return '';
  }
}

// -------------------------------------------------------------------------
// Note Content Operations
// -------------------------------------------------------------------------

/**
 * Save the current note
 */
export async function saveCurrentNote(): Promise<void> {
  const currentNoteValue = notesState$.currentNote.get();

  // Only save if there are unsaved changes and we have a path
  if (currentNoteValue.unsavedChanges && currentNoteValue.path) {
    try {
      await trpcProxyClient.notes.updateContent.mutate({
        notePath: currentNoteValue.path,
        content: currentNoteValue.content,
      });

      // Mark as saved
      notesState$.currentNote.unsavedChanges.set(false);

      const currentNoteId = currentNoteValue.id;
      const embedding = await generateEmbedding(currentNoteValue.content);

      if (currentNoteId && embedding) {
        console.log('Indexing note:', currentNoteId);
        await trpcProxyClient.notes.indexNote.mutate({
          noteId: currentNoteId,
          embedding: embedding,
        });
      }

      // Reload the notes list to get updated metadata
      await loadNotes();
    } catch (error) {
      handleError('saving note', error);
    }
  }
}

/**
 * Debounced save function for auto-saving during editing
 */
const debouncedSave = debounce(async (path: string, content: string) => {
  try {
    await trpcProxyClient.notes.updateContent.mutate({
      notePath: path,
      content: content,
    });

    // Just mark as saved in state, don't reload or change content
    notesState$.currentNote.unsavedChanges.set(false);
  } catch (error) {
    handleError('auto-saving note', error);
  }
}, 500); // 500ms debounce

/**
 * Update the content of the current note
 * @param newContent - The new content for the note
 */
export async function setNoteContent(newContent: string): Promise<void> {
  const currentNoteValue = notesState$.currentNote.get();

  // Always update local state immediately
  notesState$.currentNote.content.set(newContent);
  notesState$.currentNote.unsavedChanges.set(true);

  const currentNoteId = currentNoteValue.id;
  const embedding = await generateEmbedding(currentNoteValue.content);

  if (currentNoteId && embedding) {
    console.log('Indexing note:', currentNoteId);
    await trpcProxyClient.notes.indexNote.mutate({
      noteId: currentNoteId,
      embedding: embedding,
      forceReindex: true,
    });
  }

  // If we have a path, trigger the debounced save
  if (currentNoteValue.path) {
    debouncedSave(currentNoteValue.path, newContent);
  }
}

// -------------------------------------------------------------------------
// Folder Operations
// -------------------------------------------------------------------------

/**
 * Create a new folder
 * @param params - Parameters for creating a folder
 * @returns The newly created folder or null if creation failed
 */
export async function createFolder(params: {
  name: string;
  parentPath?: string;
}): Promise<NoteFile | null> {
  // Normalize parent path based on platform
  // On Windows, use '\' as path separator, on Linux and macOS use '/'
  if (!params.parentPath) {
    params.parentPath = '';
  } else if (params.parentPath === '\\' && process.platform !== 'win32') {
    // Convert Windows-style root path to empty string for Linux/macOS
    params.parentPath = '';
  }

  const { name, parentPath } = params;
  notesState$.isLoading.set(true);

  try {
    // Only prevent duplicate folder names within the same parent, and only among folders
    const foldersInParent = notesState$.notesList
      .get()
      .filter(
        (note) => note.parentId === (parentPath || null) && note.isFolder
      );

    const duplicateFolder = foldersInParent.some(
      (folder) => folder.title === name
    );

    if (duplicateFolder) {
      return null;
    }

    const newFolderResponse = await trpcProxyClient.notes.createFolder.mutate({
      name,
      parentPath: parentPath || '',
    });

    // Convert the response to a properly typed NoteFile
    const newFolder = convertNoteDates(newFolderResponse);

    // Reload the notes list
    await loadNotes();

    return newFolder;
  } catch (error) {
    handleError('creating folder', error);
    return null;
  } finally {
    notesState$.isLoading.set(false);
  }
}

/**
 * Toggle a folder's expanded state in the UI
 * @param folderId - The ID of the folder to toggle
 */
export function toggleFolderExpanded(folderId: string): void {
  const expandedFoldersValue = [...notesState$.expandedFolders.get()];
  const index = expandedFoldersValue.indexOf(folderId);

  if (index === -1) {
    // Folder is not expanded, add it
    expandedFoldersValue.push(folderId);
  } else {
    // Folder is expanded, remove it
    expandedFoldersValue.splice(index, 1);
  }

  notesState$.expandedFolders.set(expandedFoldersValue);
}

/**
 * Set the expanded folders list
 * @param folders - The list of folder IDs to set as expanded
 */
export function setExpandedFolders(folders: string[]): void {
  notesState$.expandedFolders.set(folders);
}

// -------------------------------------------------------------------------
// UI State Operations
// -------------------------------------------------------------------------

/**
 * Set the current scroll position of the notes list
 * @param position - The scroll position to set
 */
export function setCurrentScrollPosition(position: number): void {
  notesState$.scrollPosition.set(position);
}

/**
 * Set the active tab (notes or chats)
 * @param tab - The tab to set as active
 */
export function setActiveTab(tab: 'chats' | 'notes'): void {
  notesState$.activeTab.set(tab);
}

/**
 * Set the flag to focus the title input
 * @param value - Whether to request focus
 */
export function setRequestTitleInputFocus(value: boolean): void {
  notesState$.requestTitleInputFocus.set(value);
}

/**
 * Initialize the file system watcher to detect external changes
 */
export async function initializeFileSystemWatcher(): Promise<void> {
  try {
    // Initialize the watcher on the main process
    await trpcProxyClient.notes.initializeWatcher.mutate();

    // Set up subscription for file system changes using TRPC
    const subscription = trpcProxyClient.notes.onFileSystemChanges.subscribe(
      undefined,
      {
        onData: async () => {
          console.log(
            'Received file system change event via TRPC subscription'
          );
          // Reload notes when file system changes are detected
          await loadNotes();
        },
        onError: (err) => {
          console.error('Error in file system watcher subscription:', err);
          // Try to reconnect after a delay
          setTimeout(() => {
            console.log(
              'Attempting to reconnect file system watcher subscription'
            );
            initializeFileSystemWatcher().catch((e) =>
              console.error('Failed to reconnect file system watcher:', e)
            );
          }, 5000);
        },
      }
    );

    // Store unsubscribe function for potential cleanup
    if (typeof window !== 'undefined') {
      // Clean up subscription when window unloads
      window.addEventListener('beforeunload', () => {
        subscription.unsubscribe();
      });
    }

    console.log('File system watcher subscription initialized');
  } catch (error) {
    console.error('Failed to initialize file system watcher:', error);
  }
}
