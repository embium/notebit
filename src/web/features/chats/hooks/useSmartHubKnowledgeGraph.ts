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
import { getAllSmartHubs } from '@/features/smart-hubs/state/smartHubsState';

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
      // Always clear the used smart hubs ref array at the beginning of each search
      usedSmartHubsRef.current.splice(0, usedSmartHubsRef.current.length);

      if (selectedSmartHubIds.length === 0 || !messageContent.trim()) {
        return '';
      }

      try {
        console.log(
          'Performing knowledge graph search with knowledge graph...'
        );

        // Get search parameters
        const similarityThreshold = getSimilarityValue(
          searchParams.similarityThreshold
        );
        const limit = searchParams.chunks;

        const queryEmbedding = await generateEmbedding(messageContent);

        if (!queryEmbedding) {
          console.error('Failed to generate embedding for query');
          return '';
        }

        // Perform hybrid search with knowledge graph integration
        const results = await trpcProxyClient.smartHubs.hybridSearch.query({
          queryText: messageContent,
          queryEmbedding,
          smartHubIds: selectedSmartHubIds,
          similarityThreshold,
          limit,
        });

        if (results.length === 0) {
          console.log('No hybrid search results found');
          return '';
        }

        // Sort results by score in descending order (highest relevance first)
        const sortedResults = [...results].sort((a, b) => b.score - a.score);

        // Limit results to respect the chunks parameter
        const limitedResults = sortedResults.slice(0, limit);

        console.log(
          `Found ${results.length} knowledge graph search results, sorted by relevance and using top ${limitedResults.length} (limit: ${limit})`
        );

        // Get full content for the results
        const resultsWithContent =
          await trpcProxyClient.smartHubs.getHybridSearchContents.query(
            limitedResults
          );

        if (resultsWithContent.length === 0) {
          console.log('No content retrieved for search results');
          return '';
        }

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
            ? `Knowledge Graph: ${result.name} (${Math.round(result.score * 100)}% relevant)`
            : `Direct Match: ${result.name} (${Math.round(result.score * 100)}% relevant)`;

          // Add formatted content block
          contextParts.push(`--- ${sourceInfo} ---\n\n${result.content}\n`);
        }

        // Add a summary of found information
        contextParts.push(
          'Most relevant information based on your query:\n' +
            resultsWithContent
              .map((r) => {
                const type = r.isGraphResult
                  ? 'Knowledge Graph'
                  : 'Direct Match';
                return `- ${type}: ${r.name} (${Math.round(r.score * 100)}% relevance)`;
              })
              .join('\n')
        );

        // Build final context
        return `--- START OF INSTRUCTIONS FOR USING SMART HUBS DOCUMENTS ---
The following documents have been retrieved from Smart Hubs to help you answer my question. Please adhere to these rules:
1. Base your answer *solely* on the information contained within the provided documents.
2. Directly answer the specific question I will ask at the end.
3. Do not summarize the documents or list their general topics unless that is my specific question.
4. If the documents do not provide an answer to my question, please state that the information is not found in the provided context.
--- END OF INSTRUCTIONS FOR USING SMART HUBS DOCUMENTS ---

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
   * Completely rebuild the knowledge graph for ALL smart hubs in the system
   * This will fix issues with missing or broken knowledge graph connections
   * without requiring the user to select specific smart hubs
   */
  const rebuildAllSmartHubsKnowledgeGraph =
    useCallback(async (): Promise<boolean> => {
      try {
        // Get all smart hubs from state
        const allSmartHubs = getAllSmartHubs();

        if (allSmartHubs.length === 0) {
          console.log('No smart hubs found in the system');
          return false;
        }

        const smartHubIds = allSmartHubs.map((hub) => hub.id);
        console.log(
          `Rebuilding knowledge graph for ALL ${smartHubIds.length} smart hubs...`
        );

        // Get current Neo4j status
        const status = await trpcProxyClient.smartHubs.checkNeo4jStatus.query();

        if (!status.isConnected) {
          console.error(
            `Cannot rebuild knowledge graph: Neo4j is not connected. Status: ${status.message}`
          );
          return false;
        }

        console.log(
          'Neo4j is connected. Starting knowledge graph rebuild for ALL smart hubs...'
        );

        // Step 1: For each smart hub, get all documents
        let totalDocuments = 0;
        let successCount = 0;

        for (const smartHubId of smartHubIds) {
          console.log(`Processing smart hub: ${smartHubId}`);

          // Get all documents for this smart hub
          const documents =
            await trpcProxyClient.smartHubs.getAllDocuments.query(smartHubId);

          if (!documents || documents.length === 0) {
            console.log(`No documents found for smart hub ${smartHubId}`);
            continue;
          }

          totalDocuments += documents.length;
          console.log(
            `Found ${documents.length} documents in smart hub ${smartHubId}`
          );

          // Step 2: For each document, re-index it in the knowledge graph
          for (const doc of documents) {
            try {
              // Get the document content
              const content =
                await trpcProxyClient.smartHubs.getItemContent.query({
                  item: {
                    id: doc.documentId,
                    name: doc.metadata?.name || 'Unknown',
                    path: doc.metadata?.path || '',
                  },
                });

              if (!content) {
                console.warn(`No content found for document ${doc.documentId}`);
                continue;
              }

              // Re-index the document in the knowledge graph
              const success =
                await trpcProxyClient.smartHubs.indexDocumentWithKnowledgeGraph.mutate(
                  {
                    smartHubId,
                    itemId: doc.documentId,
                    content,
                    embedding: doc.vector,
                    metadata: doc.metadata || {},
                  }
                );

              if (success) {
                successCount++;
                console.log(
                  `Successfully re-indexed document ${doc.documentId}`
                );
              } else {
                console.warn(`Failed to re-index document ${doc.documentId}`);
              }
            } catch (docError) {
              console.error(
                `Error processing document ${doc.documentId}:`,
                docError
              );
            }
          }
        }

        console.log(
          `Re-indexed ${successCount} out of ${totalDocuments} documents`
        );

        // Step 3: Rebuild relationships between documents for all smart hubs
        let allRelationshipsBuilt = true;

        for (const smartHubId of smartHubIds) {
          try {
            const relationshipsBuilt =
              await trpcProxyClient.smartHubs.buildKnowledgeGraphRelationships.mutate(
                {
                  smartHubId,
                  similarityThreshold: 0.7, // Default value since we're rebuilding all
                }
              );

            if (!relationshipsBuilt) {
              console.warn(
                `Failed to rebuild relationships for smart hub ${smartHubId}`
              );
              allRelationshipsBuilt = false;
            }
          } catch (error) {
            console.error(
              `Error building relationships for smart hub ${smartHubId}:`,
              error
            );
            allRelationshipsBuilt = false;
          }
        }

        if (allRelationshipsBuilt) {
          console.log('Successfully rebuilt ALL knowledge graph relationships');
        } else {
          console.warn('Failed to rebuild some knowledge graph relationships');
        }

        return successCount > 0;
      } catch (error) {
        console.error('Error rebuilding ALL knowledge graphs:', error);
        return false;
      }
    }, []);

  return {
    getSmartHubKnowledgeGraphContext,
    buildSmartHubRelationships,
    rebuildAllSmartHubsKnowledgeGraph,
    selectedSmartHubIds,
  };
}
