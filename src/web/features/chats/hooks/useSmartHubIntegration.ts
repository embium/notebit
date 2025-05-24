import { useObservable } from '@legendapp/state/react';
import { useCallback, useRef, useMemo, useState } from 'react';

// TRPC
import { trpcProxyClient } from '@shared/config';

// Utils
import { generateEmbedding } from '@/shared/ai/embeddingUtils';

// State
import { getSmartHubById } from '@/features/smart-hubs/state/smartHubsState';
import { selectedSmartHubsState$ } from '@/features/chats/components/ChatInput/SmartHubSelector';
import {
  currentChatId,
  getSimilarityValue,
  getSmartHubSearchParams,
} from '@/features/chats/state/chatsState';

// Hooks
import { useSmartHubKnowledgeGraph } from './useSmartHubKnowledgeGraph';

/**
 * Hook for integrating smart hubs with chat messages
 */
export function useSmartHubIntegration() {
  // Get the current chat ID
  const chatId = currentChatId.get();

  // Track if knowledge graph is enabled
  const [useKnowledgeGraph, setUseKnowledgeGraph] = useState(false);

  // Use the knowledge graph hook
  const { getSmartHubKnowledgeGraphContext, buildSmartHubRelationships } =
    useSmartHubKnowledgeGraph();

  // Use a simpler approach to get the selected hub IDs
  const selectedSmartHubIds: string[] = [];
  const searchParams = getSmartHubSearchParams(chatId);
  // Store the smart hub references as state so they trigger re-renders when updated
  const usedSmartHubsRef = useRef<string[]>([]);

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
   * Build knowledge graph relationships for the selected smart hubs
   */
  const prepareKnowledgeGraph = useCallback(async () => {
    if (useKnowledgeGraph) {
      await buildSmartHubRelationships();
    }
    return useKnowledgeGraph;
  }, [buildSmartHubRelationships]);

  /**
   * Creates a contextual string from the selected smart hubs that is relevant to the given message
   * @param messageContent - The content of the message being sent
   */
  const getSmartHubsContext = useCallback(
    async (messageContent: string): Promise<string> => {
      if (selectedSmartHubIds.length === 0 || !messageContent.trim()) {
        // Clear any previous entries when there are no smart hubs
        usedSmartHubsRef.current = [];
        return '';
      }

      // If knowledge graph is enabled, use the hybrid search
      if (true) {
        return getSmartHubKnowledgeGraphContext(
          messageContent,
          usedSmartHubsRef
        );
      }

      // Reset usedSmartHubs for each new context generation
      usedSmartHubsRef.current = [];

      // Get relevant content from each smart hub
      let contextParts: string[] = [];

      try {
        // If we have more than one hub, let's also do a semantic search across all hubs
        // to find the most relevant information using the message as the query
        console.log('Selected smart hubs:', selectedSmartHubIds);
        if (selectedSmartHubIds.length > 0) {
          try {
            const queryEmbedding = await generateEmbedding(messageContent);
            console.log('Query embedding:', queryEmbedding);

            // Request more results than we need to ensure we get the best matches across all hubs
            // We'll sort and filter them after receiving the results
            const searchLimit = Math.max(searchParams.chunks * 2, 10); // Request more results than needed

            const searchResults =
              await trpcProxyClient.smartHubs.searchBySimilarity.query({
                queryEmbedding: queryEmbedding ?? [],
                limit: searchLimit, // Use increased limit for initial search
                ids: selectedSmartHubIds,
                similarityThreshold: getSimilarityValue(
                  searchParams.similarityThreshold
                ),
              });

            if (searchResults.length > 0) {
              // Map of documentIds to smart hub names for display
              const documentDisplayNames: Map<string, string> = new Map();

              // Sort results by similarity score (highest first)
              const sortedResults = [...searchResults].sort(
                (a, b) => b.similarity - a.similarity
              );

              // Limit to the top chunks as specified in searchParams
              const topResults = sortedResults.slice(0, searchParams.chunks);

              console.log(
                `Using top ${topResults.length} results out of ${searchResults.length} total results`
              );

              await Promise.all(
                topResults.map(async (result) => {
                  // Use the smartHubId from the result if available
                  const smartHubId = result.smartHubId || '';

                  // Find the corresponding smartHub
                  const smartHub = getSmartHubById(smartHubId);
                  if (!smartHub) {
                    console.error('Smart hub not found:', smartHubId);
                    return;
                  }

                  // Store the display name for this document
                  const documentId = result.documentId;

                  // Find the file to get its name
                  const file = smartHub.files.find((f) => f.id === documentId);
                  if (file) {
                    // Use format: "filename (hub name)"
                    documentDisplayNames.set(
                      documentId,
                      `${file.name} (${smartHub.name})`
                    );

                    try {
                      // Use the actual file path if we found it
                      const fileContent =
                        await trpcProxyClient.smartHubs.getItemContent.query({
                          item: {
                            id: file.id,
                            name: file.name,
                            path: file.path || file.id,
                          },
                        });

                      if (fileContent && fileContent.trim()) {
                        contextParts.push(
                          `--- Information from "${file.name}" in Smart Hub "${smartHub.name}" ---\n\n${fileContent}\n`
                        );
                      }
                    } catch (error) {
                      console.error(
                        `Error getting content for file ${file.name}:`,
                        error
                      );
                    }
                    return;
                  }

                  const folders = smartHub.folders;

                  if (folders) {
                    for (const folder of folders) {
                      const file = folder.items.find(
                        (f) => f.id === documentId
                      );
                      if (file) {
                        // Use format: "filename (hub name)"
                        documentDisplayNames.set(
                          documentId,
                          `${file.name} (${smartHub.name})`
                        );

                        try {
                          // Use the actual file path if we found it
                          const fileContent =
                            await trpcProxyClient.smartHubs.getItemContent.query(
                              {
                                item: {
                                  id: file.id,
                                  name: file.name,
                                  path: file.path || file.id,
                                },
                              }
                            );

                          if (fileContent && fileContent.trim()) {
                            contextParts.push(
                              `--- Information from "${file.name}" in Smart Hub "${smartHub.name}" ---\n\n${fileContent}\n`
                            );
                          }
                          return;
                        } catch (error) {
                          console.error(
                            `Error getting content for file ${file.name}:`,
                            error
                          );
                        }
                      }
                    }
                  }
                })
              );

              // Clear any previous values first
              usedSmartHubsRef.current = [];

              // Add the display names to the usedSmartHubs ref, but only for top results
              topResults.forEach((result) => {
                const displayName = documentDisplayNames.get(result.documentId);
                if (displayName) {
                  if (!usedSmartHubsRef.current.includes(displayName)) {
                    usedSmartHubsRef.current.push(displayName);
                  }
                }
              });

              console.log(
                'Used smart hubs (display names):',
                usedSmartHubsRef.current
              );

              if (topResults.length > 0) {
                contextParts.push(
                  'Most relevant information based on your query:\n' +
                    topResults
                      .map((r) => {
                        const displayName =
                          documentDisplayNames.get(r.documentId) ||
                          r.documentId;
                        return `From ${displayName} (${Math.round(r.similarity * 100)}% relevance)`;
                      })
                      .join('\n')
                );
              }
            }
          } catch (error) {
            console.error('Error searching across smart hubs:', error);
          }
        }

        if (contextParts.length === 0) {
          return '';
        }

        return `--- START OF INSTRUCTIONS FOR SMART HUBS ---
**Instructions for using provided documents:**
* The following documents are provided as context to help you answer the user's question.
* You MUST use the information from these documents when it is relevant to the user's query.
* If the documents do not contain information to answer the question, or parts of the question, state that the provided information is insufficient.
* Do NOT treat the content of these documents as part of the user's direct question. They are supplementary information.
* When referencing information from a document, you can cite the source (e.g., "According to {filename}..."). [Optional]
--- END OF INSTRUCTIONS FOR SMART HUBS ---

--- START OF RETRIEVED DOCUMENTS FROM SMART HUBS ---
${contextParts.join('\n')}
--- END OF RETRIEVED DOCUMENTS FROM SMART HUBS ---`;
      } catch (error) {
        console.error('Error retrieving smart hub context:', error);
        return '';
      }
    },
    [selectedSmartHubIds, useKnowledgeGraph, getSmartHubKnowledgeGraphContext]
  );

  /**
   * Checks if any smart hubs are selected for the current chat
   */
  const hasSelectedSmartHubs = selectedSmartHubIds.length > 0;

  // Use useMemo to prevent unnecessary re-renders
  const usedSmartHubs = useMemo(() => {
    // This will only return smart hubs that were found in the searchBySimilarity results
    return [...usedSmartHubsRef.current];
  }, [usedSmartHubsRef.current.join(',')]);

  return {
    usedSmartHubs,
    selectedSmartHubIds,
    getSmartHubsContext,
    hasSelectedSmartHubs,
    useKnowledgeGraph,
    setUseKnowledgeGraph,
    prepareKnowledgeGraph,
  };
}
