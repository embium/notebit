import vectorStorageService from './vectorStorageService';
import neo4jService from './neo4jService';
import { searchBySimilarity as vectorSearchBySimilarity } from './smartHubsVectorService';
import { getItemContent } from './fileAttachmentService';

/**
 * SmartHubsKnowledgeGraphService
 *
 * Enhances Smart Hub functionality with knowledge graph capabilities by combining
 * vector similarity search with graph-based relationship exploration
 */
export class SmartHubsKnowledgeGraphService {
  /**
   * Index a document in both vector store and knowledge graph
   * @param itemId ID of the document
   * @param smartHubId ID of the smart hub
   * @param content Document content
   * @param embedding Vector embedding for the document
   * @param metadata Additional metadata about the document
   */
  public async indexDocumentWithKnowledgeGraph(
    itemId: string,
    smartHubId: string,
    content: string,
    embedding: number[],
    metadata: Record<string, any> = {}
  ): Promise<boolean> {
    try {
      // First index in vector storage
      const vectorSuccess = await vectorStorageService.storeEmbedding(
        itemId,
        smartHubId,
        embedding,
        metadata
      );

      if (!vectorSuccess) {
        console.error('Failed to index document in vector storage');
        return false;
      }

      // Then index in Neo4j
      await neo4jService.indexDocument(itemId, smartHubId, metadata, embedding);

      // Optional: Extract entities from content and add them to the knowledge graph
      await neo4jService.extractEntities(itemId, content);

      console.log(
        `Successfully indexed document ${itemId} in smart hub ${smartHubId} with knowledge graph`
      );
      return true;
    } catch (error) {
      console.error('Error indexing document with knowledge graph:', error);
      return false;
    }
  }

  /**
   * Build relationships between documents in the knowledge graph based on vector similarity
   * @param smartHubId ID of the smart hub to build relationships for
   * @param similarityThreshold Minimum similarity threshold for creating relationships
   * @param limit Maximum number of relations per document
   */
  public async buildKnowledgeGraphRelationships(
    smartHubId: string,
    similarityThreshold: number = 0.7,
    limit: number = 5
  ): Promise<boolean> {
    try {
      // Ensure limit is an integer
      const limitInt = Math.floor(limit);

      const documents = await vectorStorageService.getAllDocuments(smartHubId);

      if (documents.length === 0) {
        return false;
      }

      // Check Neo4j connection
      if (!neo4jService.isConnected()) {
        const connected = await neo4jService.connect();
        if (!connected) {
          return false;
        }
      }

      // For each document, find similar documents and create relationships
      let relationshipsCreated = 0;
      for (const doc of documents) {
        const sourceDocId = doc.documentId;
        const embedding = doc.vector;

        const similarDocs = await vectorStorageService.searchSimilarVectors(
          smartHubId,
          embedding,
          limitInt + 1, // +1 because the document itself will be in results
          undefined,
          similarityThreshold
        );

        // Create relationships in Neo4j (skip the first one if it's the document itself)
        for (const similarDoc of similarDocs) {
          if (similarDoc.documentId !== sourceDocId) {
            await neo4jService.createRelationship(
              sourceDocId,
              similarDoc.documentId,
              similarDoc.similarity
            );
            relationshipsCreated++;
          }
        }
      }

      return true;
    } catch (error) {
      console.error('Error building knowledge graph relationships:', error);
      return false;
    }
  }

  /**
   * Perform hybrid search combining vector similarity and graph traversal
   * @param queryEmbedding Query embedding vector
   * @param smartHubIds Array of smart hub IDs to search in
   * @param similarityThreshold Minimum similarity threshold
   * @param limit Maximum number of initial vector results
   * @param graphDepth Graph traversal depth for expansion
   * @param graphResultCount Maximum number of additional results from graph traversal
   */
  public async hybridSearch(
    queryText: string,
    queryEmbedding: number[],
    smartHubIds: string[],
    similarityThreshold: number = 0.7,
    limit: number = 5
  ): Promise<
    Array<{
      documentId: string;
      smartHubId: string;
      score: number;
      isGraphResult?: boolean;
    }>
  > {
    try {
      // Ensure all limits are integers
      const limitInt = Math.floor(limit);

      // Step 1: Perform vector similarity search to find initial results
      const vectorResults = await vectorSearchBySimilarity(
        queryEmbedding,
        limitInt,
        smartHubIds,
        similarityThreshold
      );

      // Convert to the expected format
      const results = vectorResults.map((result) => ({
        documentId: result.documentId,
        smartHubId: result.smartHubId,
        score: result.similarity,
        isGraphResult: false,
      }));

      const graphResults = await neo4jService.findDocumentsByQuery(
        queryText,
        smartHubIds,
        similarityThreshold,
        limitInt
      );

      // Deduplicate graph results (exclude documents already in vector results)
      const vectorDocIds = new Set(results.map((r) => r.documentId));
      const uniqueGraphResults = graphResults
        .filter((gr) => !vectorDocIds.has(gr.documentId))
        // Remove duplicates within graph results
        .filter(
          (gr, index, self) =>
            index === self.findIndex((t) => t.documentId === gr.documentId)
        )
        // Sort by score
        .sort((a, b) => b.score - a.score)
        // Take top results
        .slice(0, limitInt)
        // Mark as graph results
        .map((gr) => ({ ...gr, isGraphResult: true }));

      // Combine vector and graph results
      results.push(...uniqueGraphResults);

      return results;
    } catch (error) {
      console.error('Error performing hybrid search:', error);
      return [];
    }
  }

  /**
   * Get the content of multiple documents from a hybrid search result
   * @param searchResults Array of search results from hybridSearch
   */
  public async getHybridSearchContents(
    searchResults: Array<{
      documentId: string;
      smartHubId: string;
      score: number;
      isGraphResult?: boolean;
    }>
  ): Promise<
    Array<{
      documentId: string;
      smartHubId: string;
      name: string;
      content: string;
      score: number;
      isGraphResult?: boolean;
    }>
  > {
    try {
      const resultsWithContent = await Promise.all(
        searchResults.map(async (result) => {
          try {
            const metadata = await vectorStorageService.getDocumentMetadata(
              result.documentId,
              result.smartHubId
            );

            if (!metadata || !metadata.path) {
              console.error(`Missing path for document ${result.documentId}`);
              return { ...result, name: '', content: '' };
            }

            // Get the content using fileAttachmentService
            const content = await getItemContent({
              id: result.documentId,
              name: metadata.name || 'Unknown',
              path: metadata.path,
            });

            return { ...result, name: metadata.name, content: content || '' };
          } catch (error) {
            console.error(
              `Error getting content for document ${result.documentId}:`,
              error
            );
            return { ...result, name: '', content: '' };
          }
        })
      );

      return resultsWithContent.filter(
        (result) => result.content.trim() !== ''
      );
    } catch (error) {
      console.error('Error getting hybrid search contents:', error);
      return [];
    }
  }

  /**
   * Find entities related to documents in a smart hub
   * @param smartHubId ID of the smart hub
   * @param entityType Type of entity to find (e.g., 'Person', 'Organization')
   * @param limit Maximum number of results
   */
  public async findRelatedEntities(
    smartHubId: string,
    entityType: string,
    limit: number = 10
  ): Promise<
    Array<{ entity: string; documentIds: string[]; confidence: number }>
  > {
    if (!neo4jService.isConnected() && !(await neo4jService.connect())) {
      return [];
    }

    try {
      // Ensure limit is an integer
      const limitInt = Math.floor(limit);

      const session = neo4jService.getSession();
      try {
        const result = await session.run(
          `
          MATCH (h:SmartHub {smartHubId: $smartHubId})<-[:BELONGS_TO]-(d:Document)
          MATCH (d)-[r:MENTIONS]->(e:${entityType})
          WITH e.name AS entity, collect(d.documentId) AS documentIds, avg(r.confidence) AS confidence
          RETURN entity, documentIds, confidence
          ORDER BY confidence DESC, size(documentIds) DESC
          LIMIT $limit
          `,
          { smartHubId, limit: limitInt }
        );

        return result.records.map((record) => ({
          entity: record.get('entity'),
          documentIds: record.get('documentIds'),
          confidence: record.get('confidence'),
        }));
      } finally {
        await session.close();
      }
    } catch (error) {
      console.error(
        `Error finding ${entityType} entities in smart hub ${smartHubId}:`,
        error
      );
      return [];
    }
  }

  /**
   * Delete a document from the knowledge graph
   * @param itemId ID of the document
   * @param smartHubId ID of the smart hub
   */
  public async deleteDocumentFromKnowledgeGraph(
    itemId: string,
    smartHubId: string
  ): Promise<boolean> {
    try {
      // Then delete from Neo4j knowledge graph
      if (neo4jService.isConnected()) {
        await neo4jService.deleteDocument(itemId);
      }

      console.log(
        `Successfully deleted document ${itemId} from smart hub ${smartHubId} knowledge graph`
      );
      return true;
    } catch (error) {
      console.error('Error deleting document from knowledge graph:', error);
      return false;
    }
  }

  /**
   * Delete all documents from a smart hub in the knowledge graph
   * @param smartHubId ID of the smart hub
   */
  public async deleteSmartHubFromKnowledgeGraph(
    smartHubId: string
  ): Promise<boolean> {
    try {
      // Then delete from Neo4j knowledge graph
      if (neo4jService.isConnected()) {
        await neo4jService.deleteSmartHubDocuments(smartHubId);
      }

      console.log(
        `Successfully deleted smart hub ${smartHubId} from knowledge graph`
      );
      return true;
    } catch (error) {
      console.error('Error deleting smart hub from knowledge graph:', error);
      return false;
    }
  }

  /**
   * Perform a knowledge graph search based on a text query
   * This uses entity extraction to find relevant documents through the knowledge graph only
   * @param queryText User's natural language query
   * @param smartHubIds Array of smart hub IDs to search in
   * @param minConfidence Minimum entity confidence threshold (default: 0.6)
   * @param limit Maximum number of results (default: 10)
   */
  public async knowledgeGraphSearch(
    queryText: string,
    smartHubIds: string[],
    minConfidence: number = 0.6,
    limit: number = 10
  ): Promise<
    Array<{
      documentId: string;
      smartHubId: string;
      score: number;
      isGraphResult: boolean;
    }>
  > {
    try {
      console.log(`[KnowledgeGraph] Starting search for query: "${queryText}"`);
      console.log(
        `[KnowledgeGraph] Smart Hub IDs: ${JSON.stringify(smartHubIds)}`
      );
      console.log(
        `[KnowledgeGraph] Confidence threshold: ${minConfidence}, Limit: ${limit}`
      );

      // Ensure limit is an integer
      const limitInt = Math.floor(limit);
      console.log(`[KnowledgeGraph] Using integer limit: ${limitInt}`);

      // Ensure Neo4j is connected
      if (!neo4jService.isConnected()) {
        console.log(
          '[KnowledgeGraph] Neo4j not connected, attempting to connect...'
        );
        const connected = await neo4jService.connect();
        console.log(
          `[KnowledgeGraph] Connection attempt result: ${connected ? 'Success' : 'Failed'}`
        );

        if (!connected) {
          console.error(
            '[KnowledgeGraph] Cannot connect to Neo4j for knowledge graph search'
          );
          return [];
        }
      } else {
        console.log('[KnowledgeGraph] Neo4j is already connected');
      }

      // Use the Neo4j service to find documents related to the query
      console.log(
        '[KnowledgeGraph] Calling neo4jService.findDocumentsByQuery...'
      );
      const graphResults = await neo4jService.findDocumentsByQuery(
        queryText,
        smartHubIds,
        minConfidence,
        limitInt
      );

      console.log(
        `[KnowledgeGraph] Found ${graphResults.length} results from Neo4j query`
      );

      if (graphResults.length === 0) {
        console.log('[KnowledgeGraph] No results found. This could indicate:');
        console.log('  - No entities were extracted from the query');
        console.log(
          '  - No documents in the graph match the extracted entities'
        );
        console.log('  - The confidence threshold may be too high');
      }

      // Mark all results as graph results
      return graphResults.map((result) => ({
        ...result,
        isGraphResult: true,
      }));
    } catch (error) {
      console.error('Error performing knowledge graph search:', error);
      return [];
    }
  }

  /**
   * Get the content of documents from a knowledge graph search
   * @param searchResults Array of search results from knowledgeGraphSearch
   */
  public async getKnowledgeGraphSearchContents(
    searchResults: Array<{
      documentId: string;
      smartHubId: string;
      score: number;
      isGraphResult: boolean;
    }>
  ): Promise<
    Array<{
      documentId: string;
      smartHubId: string;
      name: string;
      content: string;
      score: number;
      isGraphResult: boolean;
    }>
  > {
    try {
      const resultsWithContent = await Promise.all(
        searchResults.map(async (result) => {
          try {
            const metadata = await vectorStorageService.getDocumentMetadata(
              result.documentId,
              result.smartHubId
            );

            if (!metadata || !metadata.path) {
              console.error(`Missing path for document ${result.documentId}`);
              return { ...result, name: '', content: '' };
            }

            // Get the content using fileAttachmentService
            const content = await getItemContent({
              id: result.documentId,
              name: metadata.name || 'Unknown',
              path: metadata.path,
            });

            return {
              ...result,
              name: metadata.name || 'Unknown',
              content: content || '',
            };
          } catch (error) {
            console.error(
              `Error getting content for document ${result.documentId}:`,
              error
            );
            return { ...result, name: '', content: '' };
          }
        })
      );

      return resultsWithContent.filter(
        (result) => result.content.trim() !== ''
      );
    } catch (error) {
      console.error('Error getting knowledge graph search contents:', error);
      return [];
    }
  }
}

// Export singleton instance
const smartHubsKnowledgeGraphService = new SmartHubsKnowledgeGraphService();
export default smartHubsKnowledgeGraphService;
