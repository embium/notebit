import { MutableRefObject } from 'react';
import { FileSource, SmartHubFileStatus } from '@src/shared/types/smartHubs';
import { trpcProxyClient } from '@shared/config';
import {
  updateSmartHubFile,
  addOrUpdateSmartHubFolderItem,
  getSmartHubById,
} from '../state/smartHubsState';
import { generateEmbedding } from '@src/web/shared/ai/embeddingUtils';
import { toast } from 'sonner';
import { aiMemorySettings$ } from '../../settings/state/aiSettings/aiMemorySettings';

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
  for (let i = 0; i < totalFiles; i += batchSize) {
    // Check for abort request
    if (abortRef?.current) {
      console.log(`Aborting batch processing at index ${i}`);
      return results;
    }

    const batch = files.slice(i, i + batchSize);
    console.log(
      `Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(totalFiles / batchSize)}, size: ${batch.length}`
    );

    // Process each batch concurrently
    const batchResults = await Promise.allSettled(
      batch.map((file) =>
        processFile(file, smartHubId, abortRef, parentFolderId)
      )
    );

    // Count results from this batch
    batchResults.forEach((result) => {
      if (result.status === 'fulfilled' && result.value) {
        results.success++;
      } else {
        results.error++;
      }
    });

    // Provide progress updates for large batches
    if (
      (totalFiles > 10 && (i + batchSize) % 10 === 0) ||
      i + batchSize >= totalFiles
    ) {
      const processed = Math.min(i + batchSize, totalFiles);
      toast.info(
        `Processing progress: ${processed}/${totalFiles} files (${Math.round((processed / totalFiles) * 100)}%)`
      );
    }

    // Add a delay between batches to prevent UI thread exhaustion
    // Skip the delay for the last batch
    if (i + batchSize < totalFiles) {
      await sleep(delayBetweenBatches);
    }
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
      const vectorResult = await trpcProxyClient.smartHubs.indexFile.mutate({
        smartHubId: smartHubId,
        itemId: file.id,
        embedding,
        forceReindex: true,
      });

      const neo4jUri = aiMemorySettings$.neo4jUri.get();
      const neo4jUsername = aiMemorySettings$.neo4jUsername.get();
      const neo4jPassword = aiMemorySettings$.neo4jPassword.get();

      let neo4jResult;
      if (neo4jUri && neo4jUsername && neo4jPassword) {
        neo4jResult =
          await trpcProxyClient.smartHubs.indexDocumentWithKnowledgeGraph.mutate(
            {
              smartHubId: smartHubId,
              itemId: file.id,
              content,
              embedding,
              metadata: { name: file.name, path: file.path },
            }
          );
      } else {
        neo4jResult = {
          success: false,
          error: 'No Neo4j connection',
        };
      }

      if (vectorResult && neo4jResult) {
        // Success - update status to ready
        updateFileStatus(file, smartHubId, 'ready', parentFolderId);
        return true;
      } else {
        // Indexing failed
        console.warn(`Failed to index file ${file.name}`);
        updateFileStatus(file, smartHubId, 'error', parentFolderId);
        return false;
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
