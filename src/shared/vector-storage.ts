import { app } from 'electron';
import path from 'path';
import fs from 'fs';

// Define interfaces for vector items
interface VectorItem {
  id: string;
  documentId: string;
  collection: string;
  vector: number[];
  metadata?: Record<string, any>;
}

interface SearchResult {
  documentId: string;
  similarity: number;
}

/**
 * A simple file-based vector storage implementation
 * that doesn't rely on external libraries
 */
export class VectorStorage {
  private static instance: VectorStorage;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;
  private vectorsDir: string;
  private indexFile: string;
  private vectors: Map<string, VectorItem> = new Map();

  private constructor() {
    const userDataPath = app.getPath('userData');
    this.vectorsDir = path.join(userDataPath, 'vector_storage');
    this.indexFile = path.join(this.vectorsDir, 'index.json');

    // Ensure the directory exists
    if (!fs.existsSync(this.vectorsDir)) {
      fs.mkdirSync(this.vectorsDir, { recursive: true });
    }
  }

  /**
   * Get the singleton instance of the VectorStorage
   */
  public static getInstance(): VectorStorage {
    if (!VectorStorage.instance) {
      VectorStorage.instance = new VectorStorage();
    }
    return VectorStorage.instance;
  }

  /**
   * Initialize the vector storage
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      try {
        console.log('Initializing vector storage...');

        // Load existing vectors if they exist
        if (fs.existsSync(this.indexFile)) {
          try {
            const data = fs.readFileSync(this.indexFile, 'utf8');
            const items: VectorItem[] = JSON.parse(data);

            // Populate the map
            this.vectors.clear();
            for (const item of items) {
              this.vectors.set(
                this.createVectorId(item.documentId, item.collection),
                item
              );
            }

            console.log(`Loaded ${this.vectors.size} vectors from storage`);
          } catch (error) {
            console.error('Error loading vector index:', error);
            // If there's an error loading, start with an empty map
            this.vectors.clear();
          }
        } else {
          console.log('No existing vector index found, starting fresh');
        }

        this.isInitialized = true;
      } catch (error) {
        console.error('Error initializing vector storage:', error);
        this.initPromise = null;
        throw error;
      }
    })();

    return this.initPromise;
  }

  /**
   * Create a unique ID for a vector
   */
  private createVectorId(documentId: string, collection: string): string {
    return `${collection}:${documentId}`;
  }

  /**
   * Save vectors to disk
   */
  private async saveVectors(): Promise<void> {
    try {
      const items = Array.from(this.vectors.values());
      await fs.promises.writeFile(
        this.indexFile,
        JSON.stringify(items, null, 2)
      );
    } catch (error) {
      console.error('Error saving vectors:', error);
      throw error;
    }
  }

  /**
   * Store a vector embedding
   * @param documentId The document identifier
   * @param collection The collection name
   * @param embedding The vector embedding
   */
  public async storeEmbedding(
    documentId: string,
    collection: string,
    embedding: number[],
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.initialize();

    try {
      console.log(`Storing embedding for ${collection}/${documentId}`);

      // Sanitize the document ID to ensure it's storage-safe
      const sanitizedDocId = this.sanitizeDocumentId(documentId);
      const vectorId = this.createVectorId(sanitizedDocId, collection);

      // Store the vector
      this.vectors.set(vectorId, {
        id: vectorId,
        documentId: sanitizedDocId,
        collection,
        vector: embedding,
        metadata: metadata,
      });

      // Save to disk
      await this.saveVectors();

      console.log(
        `Successfully stored embedding for ${collection}/${sanitizedDocId}`
      );
    } catch (error) {
      console.error('Error storing embedding:', error);
      throw error;
    }
  }

  /**
   * Sanitizes a document ID to make it safe for storage
   * @param id The document ID to sanitize
   * @returns Sanitized document ID
   */
  private sanitizeDocumentId(id: string): string {
    // Always use forward slashes for storage to maintain cross-platform consistency
    return id.replace(/\\/g, '/');
  }

  /**
   * Desanitizes a document ID for comparison with file system paths
   * Can be useful when trying to match against Windows paths
   * @param id The document ID to desanitize
   * @returns Desanitized document ID
   */
  private desanitizeDocumentId(id: string): string {
    // Convert back to platform-specific path separators for Windows
    if (process.platform === 'win32') {
      return id.replace(/\//g, '\\');
    }
    return id;
  }

  /**
   * Search for similar vectors
   * @param embedding The query vector embedding
   * @param collection The collection name to search in
   * @param limit Maximum number of results to return
   * @param ids Optional array of document IDs to restrict the search to
   * @param similarityThreshold Optional minimum similarity threshold (0-1)
   * @returns Array of results sorted by similarity
   */
  public async searchSimilarVectors(
    embedding: number[],
    collection: string,
    limit: number,
    ids: string[] = [],
    similarityThreshold: number = 0
  ): Promise<SearchResult[]> {
    await this.initialize();

    try {
      console.log(`Searching similar vectors in collection: ${collection}`);

      // Filter vectors by collection
      let collectionVectors = Array.from(this.vectors.values()).filter(
        (item) => item.collection === collection
      );

      if (ids.length > 0) {
        collectionVectors = collectionVectors.filter((item) =>
          ids.includes(item.documentId)
        );
      }

      console.log(
        `Found ${collectionVectors.length} vectors in collection ${collection}`
      );

      if (collectionVectors.length === 0) {
        return [];
      }

      // Calculate similarities
      const similarities = collectionVectors.map((item) => ({
        documentId: item.documentId,
        // Also include the platform-specific path format for Windows compatibility
        documentIdNative: this.desanitizeDocumentId(item.documentId),
        similarity: this.cosineSimilarity(embedding, item.vector),
      }));

      // Apply similarity threshold if specified
      const thresholdedSimilarities =
        similarityThreshold > 0
          ? similarities.filter(
              (item) => item.similarity >= similarityThreshold
            )
          : similarities;

      // Sort by similarity (highest first)
      thresholdedSimilarities.sort((a, b) => b.similarity - a.similarity);

      // Limit results
      const results = thresholdedSimilarities.slice(0, limit);

      console.log(
        `Returning ${results.length} similar vectors with similarity threshold ${similarityThreshold}`
      );

      return results;
    } catch (error) {
      console.error('Error searching for similar vectors:', error);
      return [];
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  public cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      console.error(`Vector length mismatch: ${a.length} vs ${b.length}`);
      throw new Error('Vectors must be of the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) {
      return 0; // Handle zero vectors
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Calculate Euclidean distance between two vectors
   */
  public euclideanDistance(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      console.error(`Vector length mismatch: ${a.length} vs ${b.length}`);
      throw new Error('Vectors must be of the same length');
    }

    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - b[i];
      sum += diff * diff;
    }

    return Math.sqrt(sum);
  }

  /**
   * Get all document IDs that have vectors stored
   */
  public async getAllDocumentIds(collection: string): Promise<string[]> {
    await this.initialize();

    //console.log(`Getting all document IDs for collection: ${collection}`);
    // console.log(`Vector storage has ${this.vectors.size} total vectors`);

    const documentIds = Array.from(this.vectors.values())
      .filter((item) => item.collection === collection)
      .map((item) => item.documentId);

    // console.log(
    //   `Found ${documentIds.length} documents in collection ${collection}`
    // );

    return [...new Set(documentIds)]; // Remove duplicates
  }

  /**
   * Close the vector storage
   */
  public async close(): Promise<void> {
    if (this.isInitialized) {
      // Save any pending changes
      await this.saveVectors();
      this.isInitialized = false;
      this.initPromise = null;
    }
  }

  /**
   * Delete all vectors for a specific collection
   * @param collection The collection name
   */
  public async clearCollection(collection: string): Promise<number> {
    await this.initialize();

    try {
      console.log(`Clearing all vectors for collection: ${collection}`);

      // Get all items in the collection
      const itemsToDelete = Array.from(this.vectors.values()).filter(
        (item) => item.collection === collection
      );

      const count = itemsToDelete.length;

      // Remove all matching items
      for (const item of itemsToDelete) {
        this.vectors.delete(item.id);
      }

      // Save to disk
      if (count > 0) {
        await this.saveVectors();
        console.log(`Deleted ${count} vectors from collection ${collection}`);
      } else {
        console.log(`No vectors found in collection ${collection}`);
      }

      return count;
    } catch (error) {
      console.error(`Error clearing collection ${collection}:`, error);
      throw error;
    }
  }

  /**
   * Delete all vectors for a specific document
   * @param documentId The document ID to delete vectors for
   * @param collection The collection name
   */
  public async deleteDocumentVectors(
    documentId: string,
    collection: string
  ): Promise<void> {
    await this.initialize();

    try {
      console.log(`Deleting vectors for ${collection}/${documentId}`);

      const sanitizedDocId = this.sanitizeDocumentId(documentId);
      const vectorId = this.createVectorId(sanitizedDocId, collection);

      // Remove from memory
      const deleted = this.vectors.delete(vectorId);

      // Save to disk
      if (deleted) {
        await this.saveVectors();
        console.log(`Deleted vector for ${collection}/${sanitizedDocId}`);
      } else {
        console.log(`No vector found for ${collection}/${sanitizedDocId}`);
      }
    } catch (error) {
      console.error('Error deleting document vectors:', error);
      throw error;
    }
  }
}

// Export singleton instance getter
export const getVectorStorage = (): VectorStorage => {
  return VectorStorage.getInstance();
};

// Export helper functions for compatibility
export const storeEmbedding = async (
  documentId: string,
  collection: string,
  embedding: number[]
): Promise<void> => {
  const storage = getVectorStorage();
  await storage.storeEmbedding(documentId, collection, embedding);
};

export const searchSimilarVectors = async (
  embedding: number[],
  collection: string,
  limit: number = 10,
  ids: string[] = [],
  similarityThreshold: number = 0
): Promise<{ documentId: string; similarity: number }[]> => {
  const storage = getVectorStorage();
  return storage.searchSimilarVectors(
    embedding,
    collection,
    limit,
    ids,
    similarityThreshold
  );
};

export const clearCollection = async (collection: string): Promise<number> => {
  const storage = getVectorStorage();
  return storage.clearCollection(collection);
};

export const cosineSimilarity = (a: number[], b: number[]): number => {
  const storage = getVectorStorage();
  return storage.cosineSimilarity(a, b);
};

export const euclideanDistance = (a: number[], b: number[]): number => {
  const storage = getVectorStorage();
  return storage.euclideanDistance(a, b);
};
