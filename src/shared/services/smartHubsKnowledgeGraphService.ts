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
      // Get all document vectors for this smart hub
      const documents = await vectorStorageService.getAllDocuments(smartHubId);

      if (documents.length === 0) {
        console.log(`No documents found in smart hub ${smartHubId}`);
        return false;
      }

      console.log(
        `Building relationships for ${documents.length} documents in smart hub ${smartHubId}`
      );

      // For each document, find similar documents and create relationships
      for (const doc of documents) {
        const sourceDocId = doc.documentId;
        const embedding = doc.vector;

        // Find similar documents using vector search
        const similarDocs = await vectorStorageService.searchSimilarVectors(
          smartHubId,
          embedding,
          limit + 1, // +1 because the document itself will be in results
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
          }
        }
      }

      console.log(
        `Successfully built knowledge graph relationships for smart hub ${smartHubId}`
      );
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
    queryEmbedding: number[],
    smartHubIds: string[],
    similarityThreshold: number = 0.7,
    limit: number = 5,
    graphDepth: number = 2,
    graphResultCount: number = 5
  ): Promise<
    Array<{
      documentId: string;
      smartHubId: string;
      score: number;
      isGraphResult?: boolean;
    }>
  > {
    try {
      // Step 1: Perform vector similarity search to find initial results
      const vectorResults = await vectorSearchBySimilarity(
        queryEmbedding,
        limit,
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

      // Step 2: For each vector result, find related documents through graph traversal
      if (results.length > 0 && neo4jService.isConnected()) {
        // We'll collect all graph results first, then deduplicate and take top ones
        const allGraphResults: Array<{
          documentId: string;
          smartHubId: string;
          score: number;
        }> = [];

        // Limit number of seed documents to avoid excessive processing
        const seedDocuments = results.slice(0, Math.min(3, results.length));

        for (const seedDoc of seedDocuments) {
          const graphResults = await neo4jService.findRelatedDocuments(
            seedDoc.documentId,
            graphDepth,
            similarityThreshold,
            graphResultCount
          );

          allGraphResults.push(...graphResults);
        }

        // Deduplicate graph results (exclude documents already in vector results)
        const vectorDocIds = new Set(results.map((r) => r.documentId));
        const uniqueGraphResults = allGraphResults
          .filter((gr) => !vectorDocIds.has(gr.documentId))
          // Remove duplicates within graph results
          .filter(
            (gr, index, self) =>
              index === self.findIndex((t) => t.documentId === gr.documentId)
          )
          // Sort by score
          .sort((a, b) => b.score - a.score)
          // Take top results
          .slice(0, graphResultCount)
          // Mark as graph results
          .map((gr) => ({ ...gr, isGraphResult: true }));

        // Combine vector and graph results
        results.push(...uniqueGraphResults);
      }

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
            // First, we need to get the item metadata
            console.log('result.documentId', result.documentId);
            const metadata = await vectorStorageService.getDocumentMetadata(
              result.documentId,
              result.smartHubId
            );

            if (!metadata || !metadata.path) {
              console.error(`Missing path for document ${result.documentId}`);
              return { ...result, name: '', content: '' };
            }

            console.log('metadata.path', metadata.path);

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
          { smartHubId, limit }
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
}

// Export singleton instance
const smartHubsKnowledgeGraphService = new SmartHubsKnowledgeGraphService();
export default smartHubsKnowledgeGraphService;
