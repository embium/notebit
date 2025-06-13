import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { connect } from '@lancedb/lancedb';
import type { Table } from '@lancedb/lancedb';
import {
  Schema,
  Field,
  FixedSizeList,
  Float32,
  Utf8,
  Struct,
} from 'apache-arrow';
import { store } from '../storage';
import { EmbeddingModel, ProviderConfig, ProviderType } from '../types/ai';
import { PROVIDER_EMBEDDING_MODELS } from '../constants';

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
 * A LanceDB-based vector storage implementation
 */
export class VectorStorage {
  private static instance: VectorStorage;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;
  private vectorsDir: string;
  private db: Awaited<ReturnType<typeof connect>> | null = null;
  private tables: Map<string, Table> = new Map();
  // Default to 1536 dimensions (OpenAI's default) if we can't determine from settings
  private dimensions: number = 1536;
  // Keep track of dimensions for each collection
  private collectionDimensions: Map<string, number> = new Map();

  private constructor() {
    const userDataPath = app.getPath('userData');
    this.vectorsDir = path.join(userDataPath, 'vector_storage_lancedb');

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

  public async getDimensions(): Promise<number> {
    try {
      let currentEmbeddingModelId: string | null = null;
      const aiSettingsDoc = await store.get('legend_state_ai-settings-state');
      const aiMemorySettingsDoc = await store.get(
        'legend_state_ai-memory-settings-state'
      );
      if (!aiSettingsDoc || !('value' in aiSettingsDoc)) {
        console.log('No AI settings found in store.');
        return this.dimensions; // Return default dimensions
      }
      if (!aiMemorySettingsDoc || !('value' in aiMemorySettingsDoc)) {
        console.log('No AI memory settings found in store.');
        return this.dimensions; // Return default dimensions
      }
      const aiSettingsData = aiSettingsDoc.value as {
        value: {
          providers: any;
        };
      };
      const aiMemorySettingsData = aiMemorySettingsDoc.value as {
        value: {
          embeddingModel: string;
        };
      };
      if (
        aiMemorySettingsData.value &&
        aiMemorySettingsData.value.embeddingModel
      ) {
        currentEmbeddingModelId = aiMemorySettingsData.value.embeddingModel;
      }
      let embeddingModels: EmbeddingModel[] = [];
      const enabledProviders = Object.values(
        aiSettingsData.value.providers
      ).filter(
        (provider) => (provider as ProviderConfig).enabled
      ) as ProviderConfig[];
      if (enabledProviders.length === 0) {
        console.log('No enabled providers found in store.');
        return this.dimensions; // Return default dimensions
      }
      enabledProviders.forEach((provider) => {
        if (!provider) return;
        const providerModels =
          PROVIDER_EMBEDDING_MODELS[provider.id as ProviderType] || [];
        embeddingModels.push(...providerModels);
      });
      if (embeddingModels.length === 0) {
        console.log('No embedding models found in store.');
        return this.dimensions; // Return default dimensions
      }
      const currentEmbeddingModel = embeddingModels.find(
        (model) => model.id === currentEmbeddingModelId
      );
      if (!currentEmbeddingModel) {
        console.log('No embedding model found in store.');
        return this.dimensions; // Return default dimensions
      }

      const dimensions = currentEmbeddingModel.dimensions;
      console.log(`Found embedding model dimensions: ${dimensions}`);
      return dimensions > 0 ? dimensions : this.dimensions; // Use default if dimensions is 0
    } catch (error) {
      console.error('Error loading embedding model', error);
      return this.dimensions; // Return default dimensions
    }
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
        console.log('Initializing LanceDB vector storage...');
        this.db = await connect(this.vectorsDir);

        // Get dimensions from settings
        const dimensions = await this.getDimensions();
        if (dimensions > 0) {
          this.dimensions = dimensions;
        }

        console.log(
          `LanceDB vector storage initialized with default dimensions: ${this.dimensions}`
        );
        this.isInitialized = true;
      } catch (error) {
        console.error('Error initializing LanceDB vector storage:', error);
        this.initPromise = null;
        throw error;
      }
    })();

    return this.initPromise;
  }

  /**
   * Get dimensions for a specific collection
   */
  private getCollectionDimensions(collection: string): number {
    return this.collectionDimensions.get(collection) || this.dimensions;
  }

  /**
   * Set dimensions for a specific collection
   */
  private setCollectionDimensions(
    collection: string,
    dimensions: number
  ): void {
    this.collectionDimensions.set(collection, dimensions);
  }

  /**
   * Get or create a table for a collection
   */
  private async getTable(collection: string): Promise<Table> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    // Check if we already have this table in memory
    if (this.tables.has(collection)) {
      return this.tables.get(collection)!;
    }

    // Check if the table exists in the database
    const tableNames = await this.db.tableNames();

    if (tableNames.includes(collection)) {
      const table = await this.db.openTable(collection);
      this.tables.set(collection, table);

      // Try to determine the dimensions from the first record
      try {
        const firstRecord = await table.query().limit(1).toArray();
        if (firstRecord.length > 0 && firstRecord[0].vector) {
          const vector = firstRecord[0].vector as number[];
          if (Array.isArray(vector) && vector.length > 0) {
            this.setCollectionDimensions(collection, vector.length);
            console.log(
              `Detected dimensions for collection ${collection}: ${vector.length}`
            );
          }
        }
      } catch (error) {
        console.warn(
          `Could not determine dimensions for collection ${collection}: ${error}`
        );
      }

      return table;
    }

    // We'll create the table when the first real embedding is stored
    // This avoids the dummy record issue
    throw new Error(
      `Table ${collection} does not exist. It will be created when data is added.`
    );
  }

  /**
   * Create a new table for a collection
   */
  private async createTable(
    collection: string,
    dimensions: number
  ): Promise<Table> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    console.log(
      `Creating new table ${collection} with vector dimensions: ${dimensions}`
    );

    // Store the dimensions for this collection
    this.setCollectionDimensions(collection, dimensions);

    // Create the table with a schema that defines the expected structure
    // This allows creating an empty table without any initial data
    const schema = new Schema([
      new Field('id', new Utf8(), false),
      new Field('documentId', new Utf8(), false),
      new Field('collection', new Utf8(), false),
      new Field(
        'vector',
        new FixedSizeList(dimensions, new Field('item', new Float32(), true)),
        false
      ),
      new Field(
        'metadata',
        new Struct([
          new Field('title', new Utf8(), true),
          new Field('path', new Utf8(), true),
          new Field('type', new Utf8(), true),
          new Field('name', new Utf8(), true),
          new Field('description', new Utf8(), true),
          new Field('sourceDocumentId', new Utf8(), true),
          new Field('subject', new Utf8(), true),
          new Field('predicate', new Utf8(), true),
          new Field('object', new Utf8(), true),
        ]),
        true
      ),
    ]);

    // Create the table with the schema
    const table = await this.db.createTable(collection, [], { schema });
    this.tables.set(collection, table);
    return table;
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
      // Validate the embedding
      if (!Array.isArray(embedding) || embedding.length === 0) {
        console.error('Invalid embedding: must be a non-empty array');
        throw new Error('Invalid embedding: must be a non-empty array');
      }

      // Sanitize the document ID to ensure it's storage-safe
      const sanitizedDocId = this.sanitizeDocumentId(documentId);
      const vectorId = this.createVectorId(sanitizedDocId, collection);

      let table: Table;
      try {
        // Try to get the existing table
        table = await this.getTable(collection);

        // Check if the embedding dimensions match the collection dimensions
        const collectionDimensions = this.getCollectionDimensions(collection);
        if (embedding.length !== collectionDimensions) {
          console.warn(
            `Embedding dimension mismatch: collection ${collection} expects ${collectionDimensions}, got ${embedding.length}`
          );

          // If the difference is small, we can pad or truncate
          if (Math.abs(embedding.length - collectionDimensions) < 100) {
            if (embedding.length < collectionDimensions) {
              // Pad with zeros
              embedding = [
                ...embedding,
                ...new Array(collectionDimensions - embedding.length).fill(0),
              ];
              console.log(`Padded embedding to ${embedding.length} dimensions`);
            } else {
              // Truncate
              embedding = embedding.slice(0, collectionDimensions);
              console.log(
                `Truncated embedding to ${embedding.length} dimensions`
              );
            }
          } else {
            console.error(
              `Cannot store embedding with significantly different dimensions than the collection`
            );
            throw new Error(
              `Embedding dimension mismatch: collection ${collection} expects ${collectionDimensions}, got ${embedding.length}`
            );
          }
        }
      } catch (error) {
        // Table doesn't exist, create it with the dimensions of this embedding
        console.log(
          `Creating new table ${collection} for first embedding with dimensions ${embedding.length}`
        );
        table = await this.createTable(collection, embedding.length);
      }

      // Delete existing vector if it exists (as an upsert operation)
      try {
        await table.delete(`"id" = '${vectorId}'`);
      } catch (error) {
        // Ignore errors when deleting non-existent records
        console.log(`No existing record to delete for ${vectorId}`);
      }

      // Insert the vector
      await table.add([
        {
          id: vectorId,
          documentId: sanitizedDocId,
          collection,
          vector: embedding,
          metadata: metadata || {},
        },
      ]);

      console.log(
        `Successfully stored embedding for ${collection}/${sanitizedDocId}`
      );
    } catch (error) {
      console.error('Error storing embedding:', error);
      throw error;
    }
  }

  /**
   * Create a unique ID for a vector
   */
  private createVectorId(documentId: string, collection: string): string {
    return `${collection}:${documentId}`;
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

      // Validate the embedding
      if (!Array.isArray(embedding) || embedding.length === 0) {
        console.error('Invalid search vector: empty or not an array');
        return [];
      }

      // Check if the table exists
      const tableNames = await this.db!.tableNames();
      if (!tableNames.includes(collection)) {
        console.log(
          `Collection ${collection} does not exist, returning empty results`
        );
        return [];
      }

      const table = await this.getTable(collection);
      const collectionDimensions = this.getCollectionDimensions(collection);

      // Check if the embedding dimensions match our expected dimensions
      if (embedding.length !== collectionDimensions) {
        console.warn(
          `Search vector dimension mismatch: collection ${collection} expects ${collectionDimensions}, got ${embedding.length}`
        );

        // If the dimensions don't match, we need to either pad or truncate the embedding
        if (embedding.length < collectionDimensions) {
          // Pad with zeros
          embedding = [
            ...embedding,
            ...new Array(collectionDimensions - embedding.length).fill(0),
          ];
          console.log(`Padded search vector to ${embedding.length} dimensions`);
        } else {
          // Truncate
          embedding = embedding.slice(0, collectionDimensions);
          console.log(
            `Truncated search vector to ${embedding.length} dimensions`
          );
        }
      }

      // Build query
      let query = table.search(embedding);

      // Apply filter if IDs are provided
      if (ids.length > 0) {
        const sanitizedIds = ids.map((id) => this.sanitizeDocumentId(id));
        const idFilter = sanitizedIds
          .map((id) => `"documentId" = '${id}'`)
          .join(' OR ');
        query = query.where(`(${idFilter})`);
      }

      // Execute search
      const results = await query.limit(limit).toArray();

      // Transform results
      const searchResults: SearchResult[] = results.map((item) => {
        // _distance is the distance, need to convert to similarity (1 - distance)
        const distance =
          item._distance !== undefined ? (item._distance as number) : 0;
        return {
          documentId: item.documentId as string,
          similarity: 1 - distance,
        };
      });

      // Apply similarity threshold if specified
      const thresholdedResults =
        similarityThreshold > 0
          ? searchResults.filter(
              (item) => item.similarity >= similarityThreshold
            )
          : searchResults;

      console.log(
        `Returning ${thresholdedResults.length} similar vectors with similarity threshold ${similarityThreshold}`
      );

      return thresholdedResults;
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

    try {
      // Check if the table exists
      const tableNames = await this.db!.tableNames();
      if (!tableNames.includes(collection)) {
        return [];
      }

      const table = await this.getTable(collection);
      const results = await table.query().select(['documentId']).toArray();

      // Extract and deduplicate document IDs
      const documentIds = results.map((item) => item.documentId as string);
      return [...new Set(documentIds)];
    } catch (error) {
      console.error(
        `Error getting document IDs for collection ${collection}:`,
        error
      );
      return [];
    }
  }

  /**
   * Close the vector storage
   */
  public async close(): Promise<void> {
    if (this.isInitialized && this.db) {
      // Close all tables
      for (const table of this.tables.values()) {
        table.close();
      }
      this.tables.clear();
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

      // Check if the table exists
      if (!this.db) {
        throw new Error('Database not initialized');
      }

      const tableNames = await this.db.tableNames();
      if (!tableNames.includes(collection)) {
        console.log(`No collection found with name ${collection}`);
        return 0;
      }

      // Drop the table
      await this.db.dropTable(collection);

      // Remove from cache
      this.tables.delete(collection);
      this.collectionDimensions.delete(collection);

      console.log(`Deleted vectors from collection ${collection}`);
      return 1; // We don't have a way to know the exact count
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

      // Check if the table exists
      const tableNames = await this.db!.tableNames();
      if (!tableNames.includes(collection)) {
        console.log(
          `Collection ${collection} does not exist, nothing to delete`
        );
        return;
      }

      const sanitizedDocId = this.sanitizeDocumentId(documentId);
      const vectorId = this.createVectorId(sanitizedDocId, collection);

      const table = await this.getTable(collection);
      await table.delete(`"id" = '${vectorId}'`);

      console.log(`Deleted vector for ${collection}/${sanitizedDocId}`);
    } catch (error) {
      console.error('Error deleting document vectors:', error);
      throw error;
    }
  }

  /**
   * Delete embedding for a document
   * @param documentId The document ID
   * @param collection The collection name
   */
  public async deleteEmbedding(
    documentId: string,
    collection: string
  ): Promise<void> {
    await this.deleteDocumentVectors(documentId, collection);
  }

  /**
   * Check if a document has embeddings in a collection
   * @param documentId The document ID
   * @param collection The collection name
   * @returns True if document exists in the collection
   */
  public async hasDocument(
    documentId: string,
    collection: string
  ): Promise<boolean> {
    await this.initialize();

    try {
      // Check if the table exists
      const tableNames = await this.db!.tableNames();
      if (!tableNames.includes(collection)) {
        return false;
      }

      const sanitizedDocId = this.sanitizeDocumentId(documentId);
      const table = await this.getTable(collection);

      const results = await table
        .query()
        .where(`"documentId" = '${sanitizedDocId}'`)
        .limit(1)
        .toArray();

      return results.length > 0;
    } catch (error) {
      console.error(`Error checking if document exists: ${error}`);
      return false;
    }
  }

  /**
   * Get all documents in a collection
   * @param collection The collection name
   * @returns Array of document objects
   */
  public async getAllDocumentsInCollection(collection: string): Promise<
    Array<{
      documentId: string;
      vector: number[];
      metadata?: Record<string, any>;
    }>
  > {
    await this.initialize();

    try {
      // Check if the table exists
      const tableNames = await this.db!.tableNames();
      if (!tableNames.includes(collection)) {
        return [];
      }

      const table = await this.getTable(collection);
      const results = await table.query().toArray();

      return results.map((item) => ({
        documentId: item.documentId as string,
        vector: item.vector as number[],
        metadata: item.metadata as Record<string, any> | undefined,
      }));
    } catch (error) {
      console.error(
        `Error getting all documents in collection ${collection}:`,
        error
      );
      return [];
    }
  }

  /**
   * Get a document with its metadata
   * @param documentId The document ID
   * @param collection The collection name
   * @returns Document object or undefined if not found
   */
  public async getDocument(
    documentId: string,
    collection: string
  ): Promise<
    | {
        documentId: string;
        vector: number[];
        metadata?: Record<string, any>;
      }
    | undefined
  > {
    await this.initialize();

    try {
      // Check if the table exists
      const tableNames = await this.db!.tableNames();
      if (!tableNames.includes(collection)) {
        console.log(
          `Collection ${collection} does not exist when looking for document ${documentId}`
        );
        return undefined;
      }

      const sanitizedDocId = this.sanitizeDocumentId(documentId);
      console.log(
        `Looking for document ${sanitizedDocId} in collection ${collection}`
      );

      const table = await this.getTable(collection);

      // First try with double quotes (case sensitive)
      try {
        const results = await table
          .query()
          .where(`"documentId" = '${sanitizedDocId}'`)
          .limit(1)
          .toArray();

        if (results.length > 0) {
          const item = results[0];
          console.log(
            `Found document ${sanitizedDocId} in collection ${collection} with double quotes`
          );
          return {
            documentId: item.documentId as string,
            vector: item.vector as number[],
            metadata: item.metadata as Record<string, any> | undefined,
          };
        }
      } catch (error: any) {
        console.log(`Error with double quotes query: ${error.message}`);
      }

      // If that fails, try without quotes (might be case insensitive in some setups)
      try {
        const results = await table
          .query()
          .where(`documentId = '${sanitizedDocId}'`)
          .limit(1)
          .toArray();

        if (results.length > 0) {
          const item = results[0];
          console.log(
            `Found document ${sanitizedDocId} in collection ${collection} without quotes`
          );
          return {
            documentId: item.documentId as string,
            vector: item.vector as number[],
            metadata: item.metadata as Record<string, any> | undefined,
          };
        }
      } catch (error: any) {
        console.log(`Error with no quotes query: ${error.message}`);
      }

      // If we get here, try a more general query to see what's in the collection
      try {
        const allDocs = await table.query().limit(5).toArray();
        console.log(
          `Collection ${collection} has ${allDocs.length} documents, first few documentId values:`
        );
        for (const doc of allDocs) {
          console.log(`- ${doc.documentId} (${typeof doc.documentId})`);
        }
      } catch (error: any) {
        console.log(`Error querying all documents: ${error.message}`);
      }

      console.log(
        `Document ${documentId} not found in collection ${collection}`
      );
      return undefined;
    } catch (error) {
      console.error(`Error getting document ${documentId}:`, error);
      return undefined;
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
