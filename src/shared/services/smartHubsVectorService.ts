import { getVectorStorage, searchSimilarVectors } from '@shared/vector-storage';
import path from 'path';
import {
  supportedDocumentFileTypes,
  supportedTextFileTypes,
} from './supportedFiles';
import { Poppler } from 'node-poppler';
import xlsx from 'node-xlsx';
import officeParser from 'officeparser';
import WordExtractor from 'word-extractor';
import fs from 'fs/promises';

// Import SmartHub type
export interface SmartHub {
  id: string;
  name: string;
  status: 'draft' | 'composing' | 'ready' | 'error';
  files: Array<{
    id: string;
    name: string;
    path?: string;
    fileType: string;
    status: string;
  }>;
  folders: Array<{
    id: string;
    path: string;
    status: string;
  }>;
  notes: Array<{
    id: string;
    title?: string;
    content: string;
    status: string;
  }>;
  bookmarked: boolean;
}

/**
 * Define type for Smart Hub document to be indexed
 */
interface SmartHubDocument {
  _id: string;
  name: string;
  files: Array<{
    id: string;
    name: string;
    content?: string;
    fileType: string;
  }>;
  folders: Array<{
    id: string;
    path: string;
  }>;
  notes: Array<{
    id: string;
    title?: string;
    content: string;
  }>;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

/**
 * Determines if a file is a supported file by checking its extension
 * @param filePath Path to the file
 * @returns Boolean indicating if the file is a supported text file
 */
function isSupportedFile(filePath: string): boolean {
  const extension = path.extname(filePath).toLowerCase().replace('.', '');
  const additionalSupportedFileTypes = ['pdf', 'xls', 'xlsx', 'doc', 'ppt'];
  return (
    supportedTextFileTypes.includes(extension) ||
    supportedDocumentFileTypes.includes(extension) ||
    additionalSupportedFileTypes.includes(extension)
  );
}

/**
 * Checks if a file is a candidate for embedding based on extension and size
 * @param filePath Path to the file
 * @returns Boolean indicating if the file should be processed
 */
function isEmbeddingCandidate(filePath: string): boolean {
  try {
    // Check if it's a supported file type
    if (!isSupportedFile(filePath)) {
      return false;
    }

    return true;
  } catch (error) {
    console.error(`Error checking file ${filePath}:`, error);
    return false;
  }
}

export const convertPdfToText = async (filePath: string): Promise<string> => {
  try {
    const poppler = new Poppler();
    // Use pdfToText method which extracts text content from PDF
    const result = await poppler.pdfToText(filePath);
    return result;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    // Return empty string on error instead of throwing to avoid breaking the application
    return '';
  }
};

/**
 * Read file content as text
 * @param filePath Path to the file
 * @returns Text content of the file
 */
export async function readFileAsText(filePath: string): Promise<string> {
  try {
    const buffer = await fs.readFile(filePath, 'utf-8');
    return buffer;
  } catch (error) {
    console.error('Error reading file:', error);
    throw error;
  }
}

async function fileConversionProcedure(item: {
  fileName: string;
  path: string;
}): Promise<string> {
  try {
    const fileType = item.fileName.split('.').pop() as string;
    if (supportedTextFileTypes.includes(fileType)) {
      return await readFileAsText(item.path);
    } else if (fileType === 'pdf') {
      return await convertPdfToText(item.path);
    } else if (fileType === 'xlsx' || fileType === 'xls') {
      const data = xlsx.parse(item.path);
      if (data.length > 0) {
        return data[0].data.map((row: any) => row.join(',')).join('\n');
      }
      return '';
    } else if (supportedDocumentFileTypes.includes(fileType)) {
      const text = await officeParser.parseOfficeAsync(item.path);
      return text;
    } else if (fileType === 'doc' || fileType === 'ppt') {
      const extractor = new WordExtractor();
      const text = await extractor.extract(item.path);
      const body = text.getBody();
      if (body) return body;
    }
    return '';
  } catch (error) {
    console.error('Error converting file to b:', error);
    throw error;
  }
}

export async function doesPathExist(path: string): Promise<boolean> {
  try {
    await fs.access(path, fs.constants.F_OK);
    return true;
  } catch (error) {
    return false;
  }
}
export async function getItemContent(item: {
  id: string;
  name: string;
  path: string;
}): Promise<string> {
  try {
    // This might be a file ID rather than a path in some cases
    // First, check if it's a valid file path

    console.log('Item:', item);
    let isActualPath = false;
    try {
      isActualPath = await doesPathExist(item.path);
    } catch (error) {
      console.log(`${item.path} is not a valid file path, might be a file ID`);
    }

    if (isActualPath && !isEmbeddingCandidate(item.path)) {
      return '';
    }
    let content = `ID:${item.id}\nName:${item.name}\n\n`;

    if (isActualPath) {
      try {
        const fileContent = await fileConversionProcedure({
          fileName: item.name,
          path: item.path,
        });
        content += `Content: ${fileContent}\n`;
      } catch (error) {
        console.error(`Error reading file ${item.path}:`, error);
      }
    } else {
      content += `Note: This is a reference to item ${item.id} without a valid file path.\n`;
    }

    return content;
  } catch (error) {
    return '';
  }
}

export async function getFolderItemsRecursive(
  parentDir: string
): Promise<{ name: string; path: string; type: string }[]> {
  const items = await fs.readdir(parentDir, { withFileTypes: true });
  const results: { name: string; path: string; type: string }[] = [];

  for (const item of items) {
    const fullPath = path.join(parentDir, item.name);

    if (item.isDirectory()) {
      results.push({
        name: item.name,
        path: fullPath,
        type: 'directory',
      });

      // Recursively get items from subdirectories
      const subItems = await getFolderItemsRecursive(fullPath);
      results.push(...subItems);
    } else {
      results.push({
        name: item.name,
        path: fullPath,
        type: 'file',
      });
    }
  }

  return results;
}

/**
 * Clear a specific Smart Hub from the vector collection
 * @param smartHubId ID of the Smart Hub to remove from the collection
 */
export async function clearCollection(smartHubId: string): Promise<boolean> {
  try {
    console.log(`Clearing Smart Hub ${smartHubId}...`);
    const vectorStorage = getVectorStorage();
    await vectorStorage.initialize();
    await vectorStorage.clearCollection(smartHubId);
    return true;
  } catch (error) {
    console.error(`Error clearing Smart Hub ${smartHubId}`, error);
    return false;
  }
}

export async function deleteDocumentVectors(
  smartHubId: string,
  itemId: string
): Promise<boolean> {
  const vectorStorage = getVectorStorage();
  await vectorStorage.initialize();
  await vectorStorage.deleteDocumentVectors(itemId, smartHubId);
  return true;
}

/**
 * Index a single Smart Hub for vector search
 * @param smartHubId ID of the SmartHub to index
 * @param embedding Pre-generated embedding vector for the SmartHub
 * @param forceReindex Force reindexing even if already indexed
 */
export async function indexFile(
  itemId: string,
  smartHubId: string,
  embedding: number[],
  forceReindex = false
): Promise<boolean> {
  try {
    const vectorStorage = getVectorStorage();
    await vectorStorage.initialize();

    console.log(
      `Creating vector embeddings for smart hub ${smartHubId} item ${itemId}...`
    );

    // Store the embedding which is generated externally
    await vectorStorage.storeEmbedding(itemId, smartHubId, embedding);

    console.log(
      `Successfully indexed item ${itemId} in smart hub ${smartHubId}`
    );
    return true;
  } catch (error) {
    console.error('Error indexing smart hub:', error);
    return false;
  }
}

/**
 * Search for smart hubs by similarity to the query text
 */
export async function searchBySimilarity(
  queryEmbedding: number[],
  limit: number = 10,
  smartHubIds: string[],
  similarityThreshold: number
): Promise<{ documentId: string; similarity: number; smartHubId: string }[]> {
  try {
    console.log(
      `Searching for similar vectors in smart hubs: ${smartHubIds.join(', ')}`
    );
    // Search for similar vectors
    const vectorStorage = getVectorStorage();
    await vectorStorage.initialize();

    const searchResults: {
      documentId: string;
      similarity: number;
      smartHubId: string;
    }[] = [];
    for (const smartHubId of smartHubIds) {
      const similarVectors = await searchSimilarVectors(
        queryEmbedding,
        smartHubId,
        limit
      );

      const filteredVectors = similarVectors.filter(
        (vector) => vector.similarity >= similarityThreshold
      );

      console.log(
        `After filtering by threshold ${similarityThreshold}: ${filteredVectors.length} vectors remain`
      );

      // Add the smartHubId to each result
      const results = filteredVectors.map((result) => ({
        ...result,
        smartHubId,
      }));

      searchResults.push(...results);
    }

    // Format the results and filter out null values
    return searchResults;
  } catch (error) {
    console.error('Error searching smart hubs by similarity:', error);
    return [];
  }
}
