/**
 * Services Module
 * Re-exports services that should be used in the main process
 * The actual implementations remain in shared/services for now
 * but are imported and initialized here for the main process
 */

// Import services with default exports
import entityExtractor from '../../shared/services/entityExtractor';
import vectorStorageService from '../../shared/services/vectorStorageService';

// Import services that export functions/classes
import * as fileAttachmentService from '../../shared/services/fileAttachmentService';
import * as notesFileService from '../../shared/services/notesFileService';
import * as notesVectorService from '../../shared/services/notesVectorService';
import * as notesWatcherService from '../../shared/services/notesWatcherService';
import * as ollamaService from '../../shared/services/ollamaService';
import * as smartHubsVectorService from '../../shared/services/smartHubsVectorService';

// Import services that might have named exports
import { SmartHubsKnowledgeGraphService } from '../../shared/services/smartHubsKnowledgeGraphService';

// Re-export services
export {
  entityExtractor,
  fileAttachmentService,
  notesFileService,
  notesVectorService,
  notesWatcherService,
  ollamaService,
  SmartHubsKnowledgeGraphService,
  smartHubsVectorService,
  vectorStorageService,
};

// Initialize services that need setup
export function initializeServices(): void {
  console.log('Initializing main process services...');
  // Add any service initialization logic here
}
