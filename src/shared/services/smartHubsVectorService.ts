import vectorStorageService from './vectorStorageService';
import {
  getItemContent,
  isSupportedFile,
  isEmbeddingCandidate,
  doesPathExist,
  getFolderItemsRecursive,
} from './fileAttachmentService';

// Re-export these functions from fileAttachmentService for compatibility
export { getItemContent, doesPathExist, getFolderItemsRecursive };

// Import SmartHub type
export interface SmartHub {
  id: string;
  name: string;
  status: 'draft' | 'composing' | 'ready' | 'error';
  files: Array<{
    id: string;
    name: string;
    path?: string;
    fileType: string;
    status: string;
  }>;
  folders: Array<{
    id: string;
    path: string;
    status: string;
  }>;
  notes: Array<{
    id: string;
    title?: string;
    content: string;
    status: string;
  }>;
  bookmarked: boolean;
}

/**
 * Define type for Smart Hub document to be indexed
 */
interface SmartHubDocument {
  _id: string;
  name: string;
  files: Array<{
    id: string;
    name: string;
    content?: string;
    fileType: string;
  }>;
  folders: Array<{
    id: string;
    path: string;
  }>;
  notes: Array<{
    id: string;
    title?: string;
    content: string;
  }>;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

/**
 * Clear a specific Smart Hub from the vector collection
 * @param smartHubId ID of the Smart Hub to remove from the collection
 */
export async function clearCollection(smartHubId: string): Promise<boolean> {
  try {
    console.log(`Clearing Smart Hub ${smartHubId}...`);
    await vectorStorageService.clearCollection(smartHubId);
    return true;
  } catch (error) {
    console.error(`Error clearing Smart Hub ${smartHubId}`, error);
    return false;
  }
}

/**
 * Delete vectors for a specific document in a Smart Hub
 * @param smartHubId ID of the Smart Hub
 * @param itemId ID of the item to delete vectors for
 */
export async function deleteDocumentVectors(
  smartHubId: string,
  itemId: string
): Promise<boolean> {
  try {
    await vectorStorageService.deleteEmbedding(itemId, smartHubId);
    return true;
  } catch (error) {
    console.error(
      `Error deleting document vectors for ${itemId} in ${smartHubId}`,
      error
    );
    return false;
  }
}

/**
 * Index a single Smart Hub item for vector search
 * @param itemId ID of the item to index
 * @param smartHubId ID of the SmartHub to index
 * @param embedding Pre-generated embedding vector for the item
 * @param forceReindex Force reindexing even if already indexed
 */
export async function indexFile(
  itemId: string,
  smartHubId: string,
  embedding: number[],
  forceReindex = false
): Promise<boolean> {
  try {
    console.log(
      `Creating vector embeddings for smart hub ${smartHubId} item ${itemId}...`
    );

    // Check if we need to reindex
    if (forceReindex) {
      await vectorStorageService.deleteEmbedding(itemId, smartHubId);
    } else if (!forceReindex) {
      // Check if already indexed
      const isIndexed = await vectorStorageService.isDocumentIndexed(
        itemId,
        smartHubId
      );
      if (isIndexed) {
        console.log(
          `Item ${itemId} is already indexed in smart hub ${smartHubId}, skipping`
        );
        return true;
      }
    }

    // Store the embedding which is generated externally
    await vectorStorageService.storeEmbedding(itemId, smartHubId, embedding);

    console.log(
      `Successfully indexed item ${itemId} in smart hub ${smartHubId}`
    );
    return true;
  } catch (error) {
    console.error('Error indexing smart hub:', error);
    return false;
  }
}

/**
 * Search for smart hubs by similarity to the query text
 */
export async function searchBySimilarity(
  queryEmbedding: number[],
  limit: number = 10,
  smartHubIds: string[],
  similarityThreshold: number
): Promise<{ documentId: string; similarity: number; smartHubId: string }[]> {
  try {
    console.log(
      `Searching for similar vectors in smart hubs: ${smartHubIds.join(', ')}`
    );

    const searchResults: {
      documentId: string;
      similarity: number;
      smartHubId: string;
    }[] = [];

    for (const smartHubId of smartHubIds) {
      const similarVectors = await vectorStorageService.searchSimilarVectors(
        smartHubId,
        queryEmbedding,
        limit,
        undefined,
        similarityThreshold
      );

      console.log(
        `Found ${similarVectors.length} vectors in ${smartHubId} that meet threshold ${similarityThreshold}`
      );

      // Add the smartHubId to each result
      const results = similarVectors.map((result) => ({
        ...result,
        smartHubId,
      }));

      searchResults.push(...results);
    }

    return searchResults;
  } catch (error) {
    console.error('Error searching smart hubs by similarity:', error);
    return [];
  }
}
