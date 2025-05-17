import {
  getVectorStorage,
  storeEmbedding as storeEmbeddingInStorage,
  searchSimilarVectors as searchSimilarVectorsInStorage,
  clearCollection as clearCollectionInStorage,
} from '@shared/vector-storage';

/**
 * VectorStorageService
 *
 * Manages interaction with the vector storage system in the main process.
 * Centralizes all vector storage operations to provide a consistent interface.
 */
export class VectorStorageService {
  /**
   * Store a pre-computed embedding in the vector store
   *
   * @param id Document ID to associate with the embedding
   * @param collection Collection name to store the embedding in
   * @param embedding The pre-computed embedding vector
   * @param metadata Optional metadata to store with the embedding
   */
  async storeEmbedding(
    id: string,
    collection: string,
    embedding: number[],
    metadata?: Record<string, any>
  ): Promise<void> {
    // Normalize ID for consistent storage
    const normalizedId = this.normalizeId(id);
    console.log(`Storing embedding for ${collection}/${normalizedId}`);

    try {
      // Store the embedding in vector storage
      await storeEmbeddingInStorage(normalizedId, collection, embedding);

      // If metadata is provided, we need to handle it separately
      // since the underlying function doesn't support it directly
      if (metadata) {
        const vectorStorage = getVectorStorage();
        await vectorStorage.initialize();
        await vectorStorage.storeEmbedding(
          normalizedId,
          collection,
          embedding,
          metadata
        );
      }
    } catch (error) {
      console.error('Error storing embedding:', error);
      throw error;
    }
  }

  /**
   * Search for similar vectors using a pre-computed query embedding
   *
   * @param collection Collection to search in
   * @param queryEmbedding Pre-computed query embedding vector
   * @param limit Maximum number of results to return
   * @param ids Optional array of document IDs to restrict the search to
   * @param similarityThreshold Optional minimum similarity score (0-1) for results
   * @returns Array of matched document IDs with similarity scores
   */
  async searchSimilarVectors(
    collection: string,
    queryEmbedding: number[],
    limit: number = 10,
    ids?: string[],
    similarityThreshold: number = 0
  ): Promise<Array<{ documentId: string; similarity: number }>> {
    console.log(`Searching for similar vectors in ${collection}`);

    try {
      const results = await searchSimilarVectorsInStorage(
        queryEmbedding,
        collection,
        limit,
        ids
      );

      // Filter by similarity threshold if provided
      const filteredResults =
        similarityThreshold > 0
          ? results.filter((result) => result.similarity >= similarityThreshold)
          : results;

      console.log(
        `Found ${filteredResults.length} similar vectors in ${collection} with similarity threshold ${similarityThreshold}`
      );
      return filteredResults;
    } catch (error) {
      // Don't treat this as a critical error - just return empty results
      console.error('Error searching for similar vectors:', error);
      return [];
    }
  }

  /**
   * Delete all embeddings in a collection
   *
   * @param collection Collection to clear
   * @returns Number of cleared embeddings
   */
  async clearCollection(collection: string): Promise<number> {
    try {
      return await clearCollectionInStorage(collection);
    } catch (error) {
      // This is non-critical, so we'll just log and continue
      console.error(`Error clearing collection ${collection}:`, error);
      return 0;
    }
  }

  /**
   * Delete a specific document's embedding
   *
   * @param id Document ID to delete
   * @param collection Collection to delete from
   */
  async deleteEmbedding(id: string, collection: string): Promise<void> {
    try {
      const vectorStorage = getVectorStorage();
      await vectorStorage.initialize();
      await vectorStorage.deleteDocumentVectors(
        this.normalizeId(id),
        collection
      );
    } catch (error) {
      // This is non-critical, so we'll just log and continue
      console.error(`Error deleting embedding for ${id}:`, error);
      // Don't rethrow - allow the application to continue
    }
  }

  /**
   * Get all document IDs in a collection
   *
   * @param collection Collection to get IDs from
   * @returns Array of document IDs
   */
  async getAllDocumentIds(collection: string): Promise<string[]> {
    try {
      const vectorStorage = getVectorStorage();
      await vectorStorage.initialize();
      return await vectorStorage.getAllDocumentIds(collection);
    } catch (error) {
      // This is non-critical, so we'll just log and continue
      console.error(`Error getting document IDs for ${collection}:`, error);
      return [];
    }
  }

  /**
   * Check if a document is already indexed in a collection
   *
   * @param id Document ID to check
   * @param collection Collection to check in
   * @returns Boolean indicating if the document is indexed
   */
  async isDocumentIndexed(id: string, collection: string): Promise<boolean> {
    try {
      // Normalize the ID for comparison
      const normalizedId = this.normalizeId(id);

      // Get all document IDs in the collection
      const indexedIds = await this.getAllDocumentIds(collection);

      // Create a set of normalized IDs for efficient lookup
      const normalizedIndexedIds = new Set(
        indexedIds.map((docId) => this.normalizeId(docId))
      );

      return normalizedIndexedIds.has(normalizedId);
    } catch (error) {
      console.error(`Error checking if document ${id} is indexed:`, error);
      return false;
    }
  }

  /**
   * Normalize ID for consistent storage
   *
   * @param id ID to normalize
   * @returns Normalized ID
   */
  private normalizeId(id: string): string {
    // Always use forward slashes for storage to maintain cross-platform consistency
    let normalizedId = id.replace(/\\/g, '/');

    // Remove any leading collection prefix if it matches the target collection
    // This is to standardize IDs across the application
    const collectionPrefixPattern = /^[^/]+\//;
    if (collectionPrefixPattern.test(normalizedId)) {
      normalizedId = normalizedId.replace(collectionPrefixPattern, '');
    }

    return normalizedId;
  }
}

// Export a singleton instance for use throughout the application
const vectorStorageService = new VectorStorageService();
export default vectorStorageService;
