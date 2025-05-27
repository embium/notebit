import { app } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import { store } from '../storage';

// Types for notes
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

export interface NoteContent {
  content: string;
}

// Path to config file for storing notes directory
const configPath = path.join(app.getPath('userData'), 'config.json');

// Read config file
const readDirectory = async (): Promise<string> => {
  try {
    const doc = await store.get('legend_state_general-settings-state');
    if (doc) {
      if ('value' in doc) {
        const data = doc.value as { value: { notesDirectory: string } };
        return data.value.notesDirectory;
      }
    }
    return '';
  } catch (error) {
    console.error('Error loading Neo4j configuration:', error);
    return '';
  }
};

// Get the notes directory (user-configurable)
let cachedNotesDir: string | null = null;
const getNotesDir = async (): Promise<string> => {
  if (cachedNotesDir) return cachedNotesDir;
  const notesDir = await readDirectory();
  if (notesDir) {
    cachedNotesDir = notesDir;
    return notesDir;
  }
  const userDataPath = app.getPath('userData');
  const defaultDir = path.join(userDataPath, 'Notes');
  cachedNotesDir = defaultDir;
  return defaultDir;
};

// Set the notes directory
export const setNotesDirectory = async (dir: string): Promise<void> => {
  cachedNotesDir = dir;
};

// Get the current notes directory (for UI)
export const getNotesDirectory = async (): Promise<string> => {
  return await getNotesDir();
};

// Ensure the notes directory exists
export const initializeNotesDirectory = async (): Promise<void> => {
  const notesDir = await getNotesDir();
  try {
    await fs.access(notesDir);
  } catch (error) {
    await fs.mkdir(notesDir, { recursive: true });
  }
};

// Create a new note
export const createNote = async (
  title: string,
  content: string = '',
  parentPath: string = ''
): Promise<NoteFile> => {
  const notesDir = await getNotesDir();
  const parentDir = parentPath ? path.join(notesDir, parentPath) : notesDir;

  // Sanitize title for filename
  const safeName = title.replace(/[/\\?%*:|"<>]/g, '-');
  const filePath = path.join(parentDir, `${safeName}.md`);
  const relativePath = path.relative(notesDir, filePath);

  // Write the file
  await fs.writeFile(filePath, content);

  // Get file stats
  const stats = await fs.stat(filePath);

  return {
    id: relativePath,
    title,
    path: relativePath,
    isFolder: false,
    parentId: parentPath || null,
    createdAt: stats.birthtime,
    updatedAt: stats.mtime,
  };
};

// Create a new folder
export const createFolder = async (
  name: string,
  parentPath: string = ''
): Promise<NoteFile> => {
  const notesDir = await getNotesDir();

  // Normalize parentPath - handle empty strings and platform-specific separators
  // Empty string means root folder, so we'll just use the notesDir directly
  const parentDir =
    parentPath && parentPath.trim() !== ''
      ? path.join(notesDir, parentPath)
      : notesDir;

  // Sanitize name for folder name
  const safeName = name.replace(/[/\\?%*:|"<>]/g, '-');
  const folderPath = path.join(parentDir, safeName);
  const relativePath = path.relative(notesDir, folderPath);

  // Create the folder
  await fs.mkdir(folderPath, { recursive: true });

  // Get folder stats
  const stats = await fs.stat(folderPath);

  return {
    id: relativePath,
    title: name,
    path: relativePath,
    isFolder: true,
    parentId: parentPath || null,
    children: [],
    createdAt: stats.birthtime,
    updatedAt: stats.mtime,
  };
};

// Cache for note contents to speed up search
const noteContentCache = new Map<
  string,
  { content: string; timestamp: number }
>();
const MAX_CACHE_SIZE = 200; // Maximum number of notes to cache
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes TTL

// Get note content with caching
export const getNoteContentWithCache = async (
  notePath: string
): Promise<string> => {
  const notesDir = await getNotesDir();
  const fullPath = path.join(notesDir, notePath);

  // Check if we have a fresh cache entry
  const now = Date.now();
  const cached = noteContentCache.get(notePath);
  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.content;
  }

  try {
    // Read from file system
    const content = await fs.readFile(fullPath, 'utf-8');

    // Update cache
    noteContentCache.set(notePath, { content, timestamp: now });

    // If cache is too large, remove oldest entries
    if (noteContentCache.size > MAX_CACHE_SIZE) {
      const entries = Array.from(noteContentCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

      // Remove oldest 20% of entries
      const entriesToRemove = Math.floor(MAX_CACHE_SIZE * 0.2);
      for (let i = 0; i < entriesToRemove; i++) {
        if (entries[i]) {
          noteContentCache.delete(entries[i][0]);
        }
      }
    }

    return content;
  } catch (error) {
    console.error(`Error reading file ${notePath}:`, error);
    return '';
  }
};

// Clear the content cache for a specific note or the entire cache
export const clearNoteContentCache = (notePath?: string): void => {
  if (notePath) {
    noteContentCache.delete(notePath);
  } else {
    noteContentCache.clear();
  }
};

// Update getNoteContent to use cache for consistency
export const getNoteContent = async (notePath: string): Promise<string> => {
  return getNoteContentWithCache(notePath);
};

// Update updateNoteContent to update cache
export const updateNoteContent = async (
  notePath: string,
  content: string
): Promise<boolean> => {
  const notesDir = await getNotesDir();
  const fullPath = path.join(notesDir, notePath);

  try {
    await fs.writeFile(fullPath, content, 'utf-8');

    // Update the cache with new content
    noteContentCache.set(notePath, { content, timestamp: Date.now() });

    return true;
  } catch (error) {
    console.error('Error updating note content:', error);
    return false;
  }
};

// Update note title (renames the file)
export const updateNoteTitle = async (
  notePath: string,
  newTitle: string
): Promise<NoteFile | null> => {
  const notesDir = await getNotesDir();
  const fullPath = path.join(notesDir, notePath);
  const dirPath = path.dirname(fullPath);

  try {
    // Sanitize title for filename
    const safeName = newTitle.replace(/[/\\?%*:|"<>]/g, '-');
    const extension = path.extname(fullPath);
    const newFilePath = path.join(dirPath, `${safeName}${extension}`);
    const newRelativePath = path.relative(notesDir, newFilePath);

    await fs.rename(fullPath, newFilePath);

    // Get updated file stats
    const stats = await fs.stat(newFilePath);

    return {
      id: newRelativePath,
      title: newTitle,
      path: newRelativePath,
      isFolder: false,
      parentId: path.relative(notesDir, dirPath) || null,
      createdAt: stats.birthtime,
      updatedAt: stats.mtime,
    };
  } catch (error) {
    console.error('Error renaming note:', error);
    return null;
  }
};

// Delete a note or folder
export const deleteNote = async (notePath: string): Promise<boolean> => {
  const notesDir = await getNotesDir();
  const fullPath = path.join(notesDir, notePath);

  try {
    // Check if it's a directory or file
    const stats = await fs.stat(fullPath);

    if (stats.isDirectory()) {
      // If it's a directory, use fs.rm with recursive option
      await fs.rm(fullPath, { recursive: true, force: true });
    } else {
      // If it's a file, just unlink it
      await fs.unlink(fullPath);
    }

    // Clear the cache for this note
    clearNoteContentCache(notePath);

    return true;
  } catch (error) {
    console.error('Error deleting item:', error);
    return false;
  }
};

// Move a note or folder to another location
export const moveItem = async (
  sourcePath: string,
  targetPath: string = ''
): Promise<boolean> => {
  console.log('BACKEND moveItem called:', { sourcePath, targetPath });
  const notesDir = await getNotesDir();
  const sourceFullPath = path.join(notesDir, sourcePath);

  try {
    // Check if source exists
    await fs.access(sourceFullPath);

    // Get source name (filename or folder name)
    const sourceName = path.basename(sourceFullPath);

    // Determine target directory
    const targetDir = targetPath ? path.join(notesDir, targetPath) : notesDir;

    // Create target directory if it doesn't exist
    await fs.mkdir(targetDir, { recursive: true });

    // Full path for the destination
    const destPath = path.join(targetDir, sourceName);

    // Check if destination already exists
    try {
      await fs.access(destPath);
      // If we get here, the destination exists
      throw new Error(`Destination already exists: ${destPath}`);
    } catch (error: any) {
      // If error is "file doesn't exist", that's what we want
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }

    // Move the file or directory
    await fs.rename(sourceFullPath, destPath);

    return true;
  } catch (error) {
    console.error('Error moving item:', error);
    return false;
  }
};

// Get all notes as a tree structure
export const getAllNotes = async (): Promise<NoteFile[]> => {
  const notesDir = await getNotesDir();

  try {
    await initializeNotesDirectory();

    // Function to recursively read directory
    const readDir = async (
      dirPath: string,
      parentId: string | null = null
    ): Promise<NoteFile[]> => {
      const items = await fs.readdir(dirPath, { withFileTypes: true });
      const results: NoteFile[] = [];

      for (const item of items) {
        const fullPath = path.join(dirPath, item.name);
        const relativePath = path.relative(notesDir, fullPath);

        const stats = await fs.stat(fullPath);

        if (item.isDirectory()) {
          const children = await readDir(fullPath, relativePath);

          results.push({
            id: relativePath,
            title: item.name,
            path: relativePath,
            isFolder: true,
            parentId,
            children: children.map((child) => child.id),
            createdAt: stats.birthtime,
            updatedAt: stats.mtime,
          });

          results.push(...children);
        } else if (path.extname(item.name) === '.md') {
          results.push({
            id: relativePath,
            title: path.basename(item.name, '.md'),
            path: relativePath,
            isFolder: false,
            parentId,
            createdAt: stats.birthtime,
            updatedAt: stats.mtime,
          });
        }
      }

      return results;
    };

    return await readDir(notesDir);
  } catch (error) {
    console.error('Error getting notes:', error);
    return [];
  }
};

// Update searchNotes to use cache
export const searchNotes = async (
  query: string,
  limit: number = 20
): Promise<
  Array<{
    id: string;
    title: string;
    path: string;
    preview: string;
    score: number;
  }>
> => {
  if (!query.trim()) {
    return [];
  }

  const notes = await getAllNotes();
  const results: Array<{
    id: string;
    title: string;
    path: string;
    preview: string;
    score: number;
  }> = [];
  const lowerQuery = query.toLowerCase();

  // Pre-filter notes that might match by title before doing content search
  const potentialMatches = notes.filter(
    (note) => !note.isFolder && note.title.toLowerCase().includes(lowerQuery)
  );

  // Process title matches first
  for (const note of potentialMatches) {
    // Already matched by title, can safely add to results
    results.push({
      id: note.id,
      title: note.title,
      path: note.path,
      preview: '', // Will populate content preview later
      score: 10, // Higher score for title matches
    });
  }

  // Track notes we've already found by title match
  const processedNotes = new Set(potentialMatches.map((note) => note.id));

  // Now search by content for notes not already matched by title
  const contentSearchNotes = notes.filter(
    (note) => !note.isFolder && !processedNotes.has(note.id)
  );

  // Process in batches to avoid locking up the main process
  const BATCH_SIZE = 20;
  for (let i = 0; i < contentSearchNotes.length; i += BATCH_SIZE) {
    const batch = contentSearchNotes.slice(i, i + BATCH_SIZE);

    // Process batch in parallel
    const batchResults = await Promise.all(
      batch.map(async (note) => {
        try {
          // Get note content from cache
          const content = await getNoteContentWithCache(note.path);
          const lowerContent = content.toLowerCase();

          if (lowerContent.includes(lowerQuery)) {
            // Find the match position for preview
            const matchIndex = lowerContent.indexOf(lowerQuery);
            let preview = '';

            if (matchIndex !== -1) {
              // Extract context around the match (100 chars before and after)
              const startIndex = Math.max(0, matchIndex - 100);
              const endIndex = Math.min(
                content.length,
                matchIndex + query.length + 100
              );
              preview = content.substring(startIndex, endIndex);

              // Add ellipsis if needed
              if (startIndex > 0) {
                preview = '...' + preview;
              }
              if (endIndex < content.length) {
                preview = preview + '...';
              }
            } else {
              // Fallback preview if indexOf didn't find the match
              preview = content.substring(0, Math.min(200, content.length));
              if (content.length > 200) {
                preview += '...';
              }
            }

            // Calculate score based on occurrences
            const matches = lowerContent.split(lowerQuery).length - 1;

            return {
              id: note.id,
              title: note.title,
              path: note.path,
              preview,
              score: matches,
            };
          }
          return null;
        } catch (error) {
          console.error(`Error searching note ${note.path}:`, error);
          return null;
        }
      })
    );

    // Add valid results from this batch (filter out nulls)
    const validResults = batchResults.filter(
      (
        result
      ): result is {
        id: string;
        title: string;
        path: string;
        preview: string;
        score: number;
      } => result !== null
    );

    results.push(...validResults);
  }

  // Now fill in content previews for title matches if not already done
  await Promise.all(
    results
      .filter((result) => !result.preview)
      .map(async (result) => {
        try {
          const content = await getNoteContentWithCache(result.path);

          // Use beginning of content as preview for title matches
          result.preview = content.substring(0, Math.min(200, content.length));
          if (content.length > 200) {
            result.preview += '...';
          }

          // Add content match score if applicable
          const lowerContent = content.toLowerCase();
          if (lowerContent.includes(lowerQuery)) {
            const matches = lowerContent.split(lowerQuery).length - 1;
            result.score += matches;
          }
        } catch (error) {
          console.error(`Error getting preview for ${result.path}:`, error);
        }
      })
  );

  // Sort by score
  return results.sort((a, b) => b.score - a.score).slice(0, limit);
};

// Preload notes content into cache for faster searching
export const preloadNotesForSearch = async (): Promise<void> => {
  console.log('Preloading notes for search...');
  const notes = await getAllNotes();
  const nonFolderNotes = notes.filter((note) => !note.isFolder);

  // Preload in batches to avoid blocking the main process
  const BATCH_SIZE = 50;
  for (let i = 0; i < nonFolderNotes.length; i += BATCH_SIZE) {
    const batch = nonFolderNotes.slice(i, i + BATCH_SIZE);

    // Load batch in parallel
    await Promise.all(
      batch.map(async (note) => {
        try {
          await getNoteContentWithCache(note.path);
        } catch (error) {
          console.error(`Error preloading note ${note.path}:`, error);
        }
      })
    );

    // Small delay between batches to allow other operations
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  console.log(`Preloaded ${nonFolderNotes.length} notes for search`);
};
