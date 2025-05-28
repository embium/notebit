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
import { defaultPromptsState$ } from '../../settings/state/defaultPromptsState';

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

  // Get the smart hubs prompt
  const smartHubsPrompt = defaultPromptsState$.smartHubs.get();

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

        // Perform search with knowledge graph integration
        const results =
          await trpcProxyClient.smartHubs.findSimilarDocumentsByEmbedding.query(
            {
              queryEmbedding,
              smartHubIds: selectedSmartHubIds,
              total: limit,
              similarityThreshold,
            }
          );

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

        console.log('Limited results:', limitedResults);

        // Get full content for the results
        const resultsWithContent =
          await trpcProxyClient.smartHubs.getSearchContents.query(
            limitedResults.map((result) => ({
              document: result.document,
              score: result.score,
            }))
          );

        if (resultsWithContent.length === 0) {
          console.log('No content retrieved for search results');
          return '';
        }

        // Add the display names to the usedSmartHubs ref, but only for top results
        resultsWithContent.forEach((result) => {
          if (result.document.title) {
            if (!usedSmartHubsRef.current.includes(result.document.title)) {
              usedSmartHubsRef.current.push(result.document.title);
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
          const sourceInfo = `Knowledge Graph: ${result.document.title} (${Math.round(result.score * 100)}% relevant)`;

          // Add formatted content block
          contextParts.push(`--- ${sourceInfo} ---\n\n${result.content}\n`);
        }

        // Add a summary of found information
        contextParts.push(
          'Most relevant information based on your query:\n' +
            resultsWithContent
              .map((r) => {
                return `- Knowledge Graph: ${r.document.title} (${Math.round(r.score * 100)}% relevance)`;
              })
              .join('\n')
        );

        // Build final context
        return smartHubsPrompt.replace(
          '[SMART_HUBS_DOCUMENTS]',
          contextParts.join('\n')
        );
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

  return {
    getSmartHubKnowledgeGraphContext,
    selectedSmartHubIds,
  };
}
