import * as chokidar from 'chokidar';
import path from 'path';
import fs from 'fs/promises';
import { getNotesDirectory } from './notesFileService';

// Type definition for file change event handlers
type FileChangeCallback = () => Promise<void>;

// Event emitter for detecting file changes
let watcher: chokidar.FSWatcher | null = null;
let watchedDir: string | null = null;
let onChangeCallback: FileChangeCallback;

/**
 * Initialize the file system watcher for notes directory
 * @param onChange Callback function to execute when files change
 */
export const initializeNotesWatcher = async (
  onChange: FileChangeCallback
): Promise<void> => {
  // Store the callback
  onChangeCallback = onChange;

  // Get the notes directory path
  const notesDir = await getNotesDirectory();

  // Start watching if not already watching this directory
  await startWatching(notesDir);
};

/**
 * Start watching a directory for changes
 * @param directoryPath Path to the directory to watch
 */
const startWatching = async (directoryPath: string): Promise<void> => {
  // Don't restart watching if we're already watching this directory
  if (watcher && watchedDir === directoryPath) {
    console.log(`Already watching ${directoryPath}`);
    return;
  }

  // Close any existing watcher
  await stopWatching();

  // Ensure the directory exists before attempting to watch it
  try {
    await fs.access(directoryPath);
  } catch (error) {
    console.error(`Directory ${directoryPath} does not exist. Cannot watch.`);
    return;
  }

  // Initialize the watcher with appropriate options
  watcher = chokidar.watch(directoryPath, {
    ignored: /(^|[\/\\])\../, // Ignore dotfiles
    persistent: true,
    ignoreInitial: true, // Don't trigger events for initial file discovery
    awaitWriteFinish: {
      stabilityThreshold: 500, // Wait for file modifications to settle
      pollInterval: 100,
    },
    depth: 99, // Watch subdirectories recursively
  });

  // Store the watched directory
  watchedDir = directoryPath;

  console.log(`Started watching ${directoryPath} for changes`);

  // Set up event handlers
  if (watcher) {
    watcher
      .on('add', handleFileChange) // File added
      .on('change', handleFileChange) // File content changed
      .on('unlink', handleFileChange) // File removed
      .on('addDir', handleFileChange) // Directory added
      .on('unlinkDir', handleFileChange) // Directory removed
      .on('error', (err: unknown) => console.error(`Watcher error:`, err));
  }
};

/**
 * Handler for file system changes
 */
const handleFileChange = async (changedPath: string) => {
  const relativePath = watchedDir
    ? path.relative(watchedDir, changedPath)
    : changedPath;
  console.log(`Detected change: ${relativePath}`);

  if (onChangeCallback) {
    // Add a small delay to allow all file operations to complete
    setTimeout(async () => {
      try {
        await onChangeCallback();
      } catch (error) {
        console.error('Error in file change callback:', error);
      }
    }, 100);
  }
};

/**
 * Stop watching for file changes
 */
export const stopWatching = async (): Promise<void> => {
  if (watcher) {
    try {
      const watcherToClose = watcher;
      watcher = null; // Clear reference before closing to prevent concurrent issues
      await watcherToClose.close();
      console.log(`Stopped watching ${watchedDir}`);
      watchedDir = null;
    } catch (error) {
      console.error('Error closing watcher:', error);
    }
  }
};

/**
 * Change the watched directory
 * @param newDirectory New directory path to watch
 */
export const changeWatchedDirectory = async (
  newDirectory: string
): Promise<void> => {
  if (newDirectory !== watchedDir) {
    await startWatching(newDirectory);
  }
};
