import { MutableRefObject, useCallback } from 'react';

// TRPC
import { trpcProxyClient } from '@shared/config';

// Utils
import { generateEmbedding } from '@/shared/ai/embeddingUtils';

// State
import { selectedSmartHubsState$ } from '@/features/chats/components/ChatInput/SmartHubSelector';
import {
  currentChatId,
  getSimilarityValue,
  getSmartHubSearchParams,
} from '@/features/chats/state/chatsState';
import { aiMemorySettings$ } from '../../settings/state/aiSettings/aiMemorySettings';

/**
 * Hook for integrating Neo4j knowledge graph with smart hubs in chat messages
 * Enhances RAG with knowledge graph capabilities for more comprehensive context
 */
export function useSmartHubKnowledgeGraph() {
  // Get the current chat ID
  const chatId = currentChatId.get();

  // Get smart hub IDs for the current chat
  const selectedSmartHubIds: string[] = [];
  const searchParams = getSmartHubSearchParams(chatId);

  if (chatId) {
    // Use type assertion to explicitly define the expected structure
    const stateObj = selectedSmartHubsState$.get() as Record<string, string[]>;
    if (stateObj && stateObj[chatId]) {
      const ids = stateObj[chatId];
      if (Array.isArray(ids)) {
        selectedSmartHubIds.push(...ids);
      }
    }
  }

  /**
   * Performs a hybrid search (vector + knowledge graph) to find relevant content
   * @param messageContent The query message content
   */
  const getSmartHubKnowledgeGraphContext = useCallback(
    async (
      messageContent: string,
      usedSmartHubsRef: MutableRefObject<string[]>
    ): Promise<string> => {
      if (selectedSmartHubIds.length === 0 || !messageContent.trim()) {
        return '';
      }

      try {
        // Generate embedding for the query
        const queryEmbedding = await generateEmbedding(messageContent);
        if (!queryEmbedding || queryEmbedding.length === 0) {
          console.error('Failed to generate query embedding');
          return '';
        }

        console.log('Performing hybrid search with knowledge graph...');

        // Get search parameters
        const similarityThreshold = getSimilarityValue(
          searchParams.similarityThreshold
        );
        const limit = searchParams.chunks;

        // Perform hybrid search with knowledge graph integration
        const hybridResults =
          await trpcProxyClient.smartHubs.hybridSearch.query({
            queryEmbedding,
            smartHubIds: selectedSmartHubIds,
            similarityThreshold,
            limit,
            graphDepth: 2,
            graphResultCount: Math.max(Math.floor(limit / 2), 3), // Use about half of limit for graph results
          });

        if (hybridResults.length === 0) {
          console.log('No hybrid search results found');
          return '';
        }

        console.log(`Found ${hybridResults.length} hybrid search results`);

        // Get full content for the results
        const resultsWithContent =
          await trpcProxyClient.smartHubs.getHybridSearchContents.query(
            hybridResults
          );

        if (resultsWithContent.length === 0) {
          console.log('No content retrieved for search results');
          return '';
        }

        // Clear any previous values first
        usedSmartHubsRef.current = [];

        // Add the display names to the usedSmartHubs ref, but only for top results
        resultsWithContent.forEach((result) => {
          if (result.name) {
            if (!usedSmartHubsRef.current.includes(result.name)) {
              usedSmartHubsRef.current.push(result.name);
            }
          }
        });

        // Format results as context for the AI
        const contextParts: string[] = [];

        // Add content from each search result
        for (const result of resultsWithContent) {
          // Skip empty content
          if (!result.content || !result.content.trim()) continue;

          // Format source information
          const sourceInfo = result.isGraphResult
            ? `Knowledge Graph: ${result.documentId} (${Math.round(result.score * 100)}% relevant)`
            : `Direct Match: ${result.documentId} (${Math.round(result.score * 100)}% relevant)`;

          // Add formatted content block
          contextParts.push(`--- ${sourceInfo} ---\n\n${result.content}\n`);
        }

        // Add a summary of found information
        contextParts.push(
          'Most relevant information based on your query:\n' +
            hybridResults
              .map((r) => {
                const type = r.isGraphResult
                  ? 'Knowledge Graph'
                  : 'Direct Match';
                return `- ${type}: ${r.documentId} (${Math.round(r.score * 100)}% relevance)`;
              })
              .join('\n')
        );

        // Build final context
        return `
--- START OF INSTRUCTIONS FOR SMART HUBS ---
**Instructions for using provided documents:**
* The following documents are provided as context to help you answer the user's question.
* This includes BOTH direct vector matches AND related documents found through knowledge graph relationships.
* You MUST use the information from these documents when it is relevant to the user's query.
* If the documents do not contain information to answer the question, or parts of the question, state that the provided information is insufficient.
* Do NOT treat the content of these documents as part of the user's direct question. They are supplementary information.
* When referencing information from a document, you can cite the source.
--- END OF INSTRUCTIONS FOR SMART HUBS ---

--- START OF RETRIEVED DOCUMENTS FROM SMART HUBS ---
${contextParts.join('\n')}
--- END OF RETRIEVED DOCUMENTS FROM SMART HUBS ---`;
      } catch (error) {
        console.error(
          'Error retrieving smart hub knowledge graph context:',
          error
        );
        return '';
      }
    },
    [selectedSmartHubIds, searchParams]
  );

  /**
   * Check if the knowledge graph integration is ready to use
   */
  const isKnowledgeGraphAvailable = async (): Promise<boolean> => {
    if (selectedSmartHubIds.length === 0) {
      return false;
    }

    const neo4jUri = aiMemorySettings$.neo4jUri.get();
    const neo4jUsername = aiMemorySettings$.neo4jUsername.get();
    const neo4jPassword = aiMemorySettings$.neo4jPassword.get();

    if (!neo4jUri || !neo4jUsername || !neo4jPassword) {
      return false;
    }

    try {
      // Try to connect to the Neo4j database
      const isConnected = await trpcProxyClient.smartHubs.configureNeo4j.mutate(
        {
          uri: neo4jUri, // Default local Neo4j URI
          username: neo4jUsername, // Default Neo4j username
          password: neo4jPassword, // This should be replaced with actual password
        }
      );

      return isConnected;
    } catch (error) {
      console.error('Error checking knowledge graph availability:', error);
      return false;
    }
  };

  /**
   * Build knowledge graph relationships for selected smart hubs
   */
  const buildSmartHubRelationships = useCallback(async (): Promise<boolean> => {
    if (selectedSmartHubIds.length === 0) {
      return false;
    }

    try {
      console.log(
        'Building knowledge graph relationships for smart hubs:',
        selectedSmartHubIds
      );

      // Build relationships for each selected smart hub
      const results = await Promise.all(
        selectedSmartHubIds.map(async (smartHubId) => {
          return await trpcProxyClient.smartHubs.buildKnowledgeGraphRelationships.mutate(
            {
              smartHubId,
              similarityThreshold: getSimilarityValue(
                searchParams.similarityThreshold
              ),
            }
          );
        })
      );

      // Return true if all operations were successful
      return results.every((result) => result === true);
    } catch (error) {
      console.error('Error building knowledge graph relationships:', error);
      return false;
    }
  }, [selectedSmartHubIds, searchParams]);

  /**
   * Delete a document from the knowledge graph
   * @param documentId The document ID to delete
   * @param smartHubId The smart hub ID the document belongs to
   */
  const deleteDocumentFromKnowledgeGraph = useCallback(
    async (documentId: string, smartHubId: string): Promise<boolean> => {
      try {
        console.log(
          `Deleting document ${documentId} from knowledge graph in smart hub ${smartHubId}`
        );

        const result =
          await trpcProxyClient.smartHubs.deleteDocumentFromKnowledgeGraph.mutate(
            {
              documentId,
              smartHubId,
            }
          );

        return result;
      } catch (error) {
        console.error('Error deleting document from knowledge graph:', error);
        return false;
      }
    },
    []
  );

  /**
   * Delete an entire smart hub from the knowledge graph
   * @param smartHubId The smart hub ID to delete
   */
  const deleteSmartHubFromKnowledgeGraph = useCallback(
    async (smartHubId: string): Promise<boolean> => {
      try {
        console.log(`Deleting smart hub ${smartHubId} from knowledge graph`);

        const result =
          await trpcProxyClient.smartHubs.deleteSmartHubFromKnowledgeGraph.mutate(
            smartHubId
          );

        return result;
      } catch (error) {
        console.error('Error deleting smart hub from knowledge graph:', error);
        return false;
      }
    },
    []
  );

  return {
    getSmartHubKnowledgeGraphContext,
    isKnowledgeGraphAvailable,
    buildSmartHubRelationships,
    deleteDocumentFromKnowledgeGraph,
    deleteSmartHubFromKnowledgeGraph,
    selectedSmartHubIds,
  };
}
