/**
 * Main database configuration for NoteBit using PouchDB in Electron's main process
 *
 * This file configures PouchDB with appropriate plugins for:
 * - pouchdb-find: Enables MongoDB-like querying capabilities
 * - pouchdb-node: Provides LevelDB-based storage for optimal performance in Electron's main process
 * - relational-pouch: Supports relational data modeling on top of PouchDB's document store
 */
import findPouch from 'pouchdb-find';
import PouchDB from 'pouchdb-node';
import relationalPouch from 'relational-pouch';
import { app } from 'electron';
import path from 'path';

// Register required PouchDB plugins
PouchDB.plugin(relationalPouch).plugin(findPouch);

// Use app.getPath('userData') to store database files in the standard Electron location
// This ensures data persists between app restarts and follows platform conventions:
// - Windows: %APPDATA%\notebit\
// - macOS: ~/Library/Application Support/notebit/
// - Linux: ~/.config/notebit/
const userDataPath = app.getPath('userData');
const dbPath = path.join(userDataPath, 'app_db');

/**
 * Primary PouchDB database instance for the application
 *
 * This store provides:
 * - Document-based storage with relational modeling capabilities via relational-pouch
 * - LevelDB backend for optimized performance in Electron's main process
 * - Persistence across application restarts
 * - Advanced querying via pouchdb-find
 *
 * Use this instance for all database operations in the main process.
 * Access from the renderer process should be done via the TRPC API.
 */
export const store = new PouchDB(dbPath);
