import findPouch from 'pouchdb-find';
import PouchDB from 'pouchdb-node';
import relationalPouch from 'relational-pouch';
import { app } from 'electron';
import path from 'path';

PouchDB.plugin(relationalPouch).plugin(findPouch);

// Use absolute path based on user data directory
const userDataPath = app.getPath('userData');
const dbPath = path.join(userDataPath, 'app_db');
export const store = new PouchDB(dbPath);
