import { MutableRefObject } from 'react';
import { FileSource, SmartHubFileStatus } from '@src/types/smartHubs';
import { trpcProxyClient } from '@shared/config/index';
import {
  updateSmartHubFile,
  addOrUpdateSmartHubFolderItem,
  getSmartHubById,
} from '../state/smartHubsState';
import { generateEmbedding } from '@src/renderer/lib/ai/embeddingUtils';
import { toast } from 'sonner';
import { aiMemorySettings$ } from '../../settings/state/aiSettings/aiMemorySettings';
import { generateText } from '../../chats/api/generate-text';
import { KNOWLEDGE_GRAPH_EXTRACTION_PROMPT } from '@src/shared/constants';
import {
  createModelInstance,
  selectedModel,
} from '../../settings/state/aiSettings/aiSettingsState';
import { createSimpleMessage } from '../../chats/utils/messageUtils';
import { MessageRole } from '../../chats/utils/messageUtils';
import { ProviderType } from '@src/types/ai';
import { jsonrepair } from 'jsonrepair';

/**
 * Helper function to introduce a delay
 * @param ms Milliseconds to sleep
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Processes a batch of files for the Smart Hub
 * @param files The files to process
 * @param smartHubId The ID of the Smart Hub
 * @param abortRef Reference to an abort flag
 * @param parentFolderId The ID of the parent folder if files are inside a folder
 * @returns An object containing counts of successful and failed processing attempts
 */
export const processFileBatch = async (
  files: FileSource[],
  smartHubId: string,
  abortRef?: MutableRefObject<boolean>,
  parentFolderId: string | null = null
): Promise<{ success: number; error: number }> => {
  const results = { success: 0, error: 0 };

  // Concurrency control parameters
  const batchSize = 3; // Process 3 files at a time
  const delayBetweenBatches = 300; // Add 300ms delay between batches to reduce UI lag
  const totalFiles = files.length;

  // Show initial progress
  if (totalFiles > 5) {
    toast.info(`Processing ${totalFiles} files...`);
  }

  // Process files in batches to control concurrency
  for (const file of files) {
    // Check for abort request
    if (abortRef?.current) {
      console.log(`Aborting composition`);
      return results;
    }

    console.log(`Processing file ${file.name}`);
    const result = await processFile(
      file,
      smartHubId,
      abortRef,
      parentFolderId
    );

    if (result) {
      results.success++;
    } else {
      results.error++;
    }

    const processed = results.success + results.error;
    toast.info(
      `Processing progress: ${processed}/${totalFiles} files (${Math.round((processed / totalFiles) * 100)}%)`
    );
  }

  return results;
};

/**
 * Processes a file for the Smart Hub
 * @param file The file to process
 * @param smartHubId The ID of the Smart Hub
 * @param abortRef Reference to an abort flag
 * @param parentFolderId The ID of the parent folder if file is inside a folder
 * @returns A boolean indicating whether the processing was successful
 */
export const processFile = async (
  file: FileSource,
  smartHubId: string,
  abortRef?: MutableRefObject<boolean>,
  parentFolderId: string | null = null
): Promise<boolean> => {
  try {
    const selectedModelValue = aiMemorySettings$.knowledgeGraphModel.get();

    // Always set status to processing, regardless of current status
    // This ensures files are properly updated when recomposing
    updateFileStatus(file, smartHubId, 'processing', parentFolderId);

    // Check for abort request before starting
    if (abortRef?.current) {
      console.log(`Aborting before processing file ${file.name}`);
      return false;
    }

    // 1. Fetch file content
    let content: string;
    try {
      content = await trpcProxyClient.smartHubs.getItemContent.query({
        item: {
          id: file.id,
          name: file.name,
          path: file.path,
        },
      });

      if (!content || content.trim().length === 0) {
        console.warn(`No content found for file ${file.name}`);
        updateFileStatus(file, smartHubId, 'error', parentFolderId);
        return false;
      }
    } catch (contentError) {
      console.error(`Error fetching content for ${file.name}:`, contentError);
      updateFileStatus(file, smartHubId, 'error', parentFolderId);
      return false;
    }

    // Check for abort request after fetching content
    if (abortRef?.current) {
      console.log(`Aborting after content fetch for file ${file.name}`);
      return false;
    }

    // 2. Generate embedding
    let embedding;
    try {
      embedding = await generateEmbedding(content);

      if (!embedding) {
        console.warn(`Couldn't generate embedding for ${file.name}`);
        updateFileStatus(file, smartHubId, 'error', parentFolderId);
        return false;
      }
    } catch (embeddingError) {
      console.error(
        `Error generating embedding for ${file.name}:`,
        embeddingError
      );
      updateFileStatus(file, smartHubId, 'error', parentFolderId);
      return false;
    }

    // Check for abort request after generating embedding
    if (abortRef?.current) {
      console.log(`Aborting after embedding generation for ${file.name}`);
      return false;
    }

    // 3. Index the file with the embedding
    try {
      // Check if knowledge graph features are enabled
      const knowledgeGraphEnabled =
        aiMemorySettings$.enableKnowledgeGraph.get();
      console.log('Knowledge graph enabled:', knowledgeGraphEnabled);

      if (knowledgeGraphEnabled) {
        console.log('Processing file with knowledge graph features enabled');

        let parsedProcessedData;
        while (true) {
          const model = {
            ...selectedModelValue,
            provider: selectedModelValue.provider as ProviderType,
            temperature: 0,
            isCustom: false,
            enabled: true,
          };

          const modelInstance = createModelInstance(model);
          const constructedMessage = createSimpleMessage(
            MessageRole.User,
            KNOWLEDGE_GRAPH_EXTRACTION_PROMPT.replace(
              '[CONTENT_TO_EXTRACT]',
              content
            ),
            selectedModelValue?.name
          );

          let processedData = await generateText(modelInstance, {
            messages: [constructedMessage],
          });

          if (processedData.includes('```json')) {
            processedData = processedData
              .replace(/```(?:json|JSON)?([\s\S]*?)```/g, '$1')
              .trim();
          }

          try {
            const repairedProcessedData = jsonrepair(processedData);
            console.log('Repaired processed data:', repairedProcessedData);
            parsedProcessedData = JSON.parse(repairedProcessedData);

            // Ensure document_id is set to the file ID
            parsedProcessedData.document_id = file.id;
            break;
          } catch (error) {
            console.error(
              `Error parsing processed data for ${file.name}:`,
              error
            );
          }
        }

        // Use the LanceDB-based GraphRAG implementation
        const graphResult =
          await trpcProxyClient.smartHubs.indexProcessedData.mutate({
            llmData: parsedProcessedData,
            documentId: file.id,
            documentEmbedding: embedding,
            smartHubId: smartHubId,
            filePath: file.path,
          });

        if (graphResult) {
          // Success - update status to ready
          updateFileStatus(file, smartHubId, 'ready', parentFolderId);
          return true;
        } else {
          // Indexing failed
          console.warn(`Failed to index file ${file.name}`);
          updateFileStatus(file, smartHubId, 'error', parentFolderId);
          return false;
        }
      } else {
        // Just using regular vector search without knowledge graph
        const vectorResult = await trpcProxyClient.smartHubs.indexFile.mutate({
          smartHubId: smartHubId,
          itemId: file.id,
          embedding,
          forceReindex: true,
        });

        if (vectorResult) {
          // Success - update status to ready
          updateFileStatus(file, smartHubId, 'ready', parentFolderId);
          return true;
        } else {
          // Indexing failed
          console.warn(`Failed to index file ${file.name}`);
          updateFileStatus(file, smartHubId, 'error', parentFolderId);
          return false;
        }
      }
    } catch (indexError) {
      console.error(`Error indexing file ${file.name}:`, indexError);
      updateFileStatus(file, smartHubId, 'error', parentFolderId);
      return false;
    }
  } catch (error) {
    // Catch any unexpected errors
    console.error(`Unexpected error processing file ${file.name}:`, error);
    updateFileStatus(file, smartHubId, 'error', parentFolderId);
    return false;
  }
};

/**
 * Helper function to update a file's status either in the main list or as a folder item
 */
const updateFileStatus = (
  file: FileSource,
  smartHubId: string,
  status: SmartHubFileStatus,
  parentFolderId: string | null = null
): void => {
  const updatedFile = {
    ...file,
    status,
  };

  // Get the current file first to ensure we have the latest state
  const hub = getSmartHubById(smartHubId);
  if (!hub) return;

  if (!parentFolderId) {
    // Update in main files list
    updateSmartHubFile(smartHubId, updatedFile);
    console.log(
      `Updated status of file ${file.name} to ${status} in main list`
    );
  } else {
    // Update as folder item - this will now use the improved state update function
    addOrUpdateSmartHubFolderItem(smartHubId, parentFolderId, updatedFile);
    console.log(
      `Updated status of file ${file.name} to ${status} in folder ${parentFolderId}`
    );
  }
};
