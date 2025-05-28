import vectorStorageService from './vectorStorageService';
import neo4jService, { LlmProcessedData } from './neo4jService';
import { searchBySimilarity as vectorSearchBySimilarity } from './smartHubsVectorService';
import { getItemContent } from './fileAttachmentService';
import path from 'path';

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
  public async createVectorIndexes(dimension: number): Promise<void> {
    await neo4jService.createVectorIndexes(dimension);
  }

  public async indexProcessedData(
    llmData: LlmProcessedData,
    documentId: string,
    documentEmbedding: number[],
    smartHubId: string,
    filePath: string
  ): Promise<void> {
    const title = path.parse(filePath).name;

    const documentMetadata = {
      title: title,
      smartHubId: smartHubId,
      path: filePath,
    }; // Optional

    await neo4jService.ensureDocumentNode(documentId, documentMetadata);

    await neo4jService.addDocumentEmbedding(documentId, documentEmbedding);

    await neo4jService.indexProcessedData(title, documentId, llmData);
  }

  public async findSimilarDocumentsByEmbedding(
    queryEmbedding: number[],
    smartHubIds: string[],
    similarityThreshold: number = 0.5,
    total: number = 5
  ): Promise<Array<{ document: any; score: number }>> {
    return await neo4jService.findSimilarDocumentsByEmbedding(
      queryEmbedding,
      smartHubIds,
      similarityThreshold,
      total
    );
  }

  public async getSearchContents(
    searchResults: Array<{
      document: {
        documentId: string;
        smartHubId: string;
        path: string;
        createdAt: {
          low: number;
          high: number;
        };
        embeddingUpdatedAt: {
          low: number;
          high: number;
        };
        embedding: number[];
        title: string;
        updatedAt: {
          low: number;
          high: number;
        };
      };
      score: number;
    }>
  ): Promise<
    Array<{
      document: {
        documentId: string;
        smartHubId: string;
        path: string;
        createdAt: {
          low: number;
          high: number;
        };
        embeddingUpdatedAt: {
          low: number;
          high: number;
        };
        embedding: number[];
        title: string;
        updatedAt: {
          low: number;
          high: number;
        };
      };
      score: number;
      content: string;
    }>
  > {
    try {
      const resultsWithContent = await Promise.all(
        searchResults.map(async (result) => {
          try {
            // Get the content using fileAttachmentService
            const content = await getItemContent({
              id: result.document.documentId,
              name: result.document.title || 'Unknown',
              path: result.document.path,
            });

            return {
              ...result,
              content: content || '',
            };
          } catch (error) {
            console.error(
              `Error getting content for document ${result.document.documentId}:`,
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

  public async deleteDocumentFromKnowledgeGraph(
    documentId: string
  ): Promise<void> {
    await neo4jService.deleteDocumentAndContents(documentId);
  }

  public async deleteSmartHubDocuments(smartHubId: string): Promise<void> {
    await neo4jService.deleteSmartHubDocuments(smartHubId);
  }
}

// Export singleton instance
const smartHubsKnowledgeGraphService = new SmartHubsKnowledgeGraphService();
export default smartHubsKnowledgeGraphService;
