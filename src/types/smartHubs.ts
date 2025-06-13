/**
 * Smart Hubs Types
 */

/**
 * Result of a vector search for Smart Hubs
 */
export interface SmartHubSearchResult {
  id: string;
  name: string;
  fileCount: number;
  folderCount: number;
  noteCount: number;
  status: 'draft' | 'composing' | 'ready' | 'error';
  similarity: number;
}

export interface SmartHub {
  id: string;
  name: string;
  // embeddingModel: string;
  status: 'draft' | 'composing' | 'ready' | 'error';
  files: FileSource[];
  folders: FolderSource[];
  notes: NoteSource[];
  bookmarked: boolean;
}

export interface BaseSource {
  id: string; // Unique ID for this specific source instance within the stack
  status: 'pending' | 'processing' | 'ready' | 'error'; // Tracks indexing/readiness
  errorMessage?: string; // Optional: Stores error details if status is 'error'
}

export interface FileSource extends BaseSource {
  type: 'file'; // Discriminating literal type
  name: string; // Original filename (e.g., "research_paper.pdf")
  path: string; // The actual path where the file is stored or accessed by the app
  // (This might be an internal storage path if uploaded, or the original path if linked)
  fileType: string; // Detected or provided file extension/MIME type (e.g., "pdf", "docx", "text/plain")
}

export interface FolderSource extends BaseSource {
  type: 'folder'; // Discriminating literal type
  path: string; // The absolute path to the folder on the user's filesystem
  items: FileSource[]; // Contains all files from this folder and subfolders
}

export interface NoteSource extends BaseSource {
  type: 'note'; // Discriminating literal type
  title?: string; // Optional user-defined title for the note
  content: string; // The actual text content entered by the user
}

// Types for the settings state
export interface SmartHubsState {
  /**
   * The smart hubs
   */
  smartHubs: SmartHub[];
  knowledgeGraphEnabled: boolean;
}

export type SmartHubFileStatus = 'processing' | 'ready' | 'error';
export type SmartHubFolderStatus = 'processing' | 'ready' | 'error';

export type SmartHubFileType = 'file';
export type SmartHubFolderType = 'folder';
