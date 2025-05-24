import { promises as fs } from 'fs';
import { publicProcedure } from '@shared/trpc';
import { z } from 'zod';
import {
  supportedTextFileTypes,
  supportedDocumentFileTypes,
} from './supportedFiles';
import { Poppler } from 'node-poppler';
import xlsx from 'node-xlsx';
import officeParser from 'officeparser';
import WordExtractor from 'word-extractor';
import path from 'path';

/**
 * Read file content as a Base64 string
 * @param filePath Path to the file
 * @returns Base64 encoded file content
 */
export async function readFileAsBase64(filePath: string): Promise<string> {
  try {
    const buffer = await fs.readFile(filePath);
    return buffer.toString('base64');
  } catch (error) {
    console.error('Error reading file:', error);
    throw error;
  }
}

/**
 * Read file content as text
 * @param filePath Path to the file
 * @returns Text content of the file
 */
export async function readFileAsText(filePath: string): Promise<string> {
  try {
    const buffer = await fs.readFile(filePath);
    return buffer.toString('utf-8');
  } catch (error) {
    console.error('Error reading file:', error);
    throw error;
  }
}

/**
 * Determines if a file is a supported file by checking its extension
 * @param filePath Path to the file
 * @returns Boolean indicating if the file is a supported text file
 */
export function isSupportedFile(filePath: string): boolean {
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
export function isEmbeddingCandidate(filePath: string): boolean {
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

/**
 * Check if a path exists
 * @param path Path to check
 * @returns Boolean indicating if the path exists
 */
export async function doesPathExist(path: string): Promise<boolean> {
  try {
    await fs.access(path, fs.constants.F_OK);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Convert a PDF file to text
 * @param filePath Path to the PDF file
 * @returns Extracted text content
 */
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
 * Extract content from a file based on its type
 * @param item File information including path and name
 * @returns Extracted text content
 */
export async function extractFileContent(item: {
  fileName: string;
  path: string;
}): Promise<string> {
  try {
    const fileType = item.fileName.split('.').pop()?.toLowerCase() as string;
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
    return await readFileAsText(item.path);
  } catch (error) {
    console.error('Error extracting file content:', error);
    return '';
  }
}

/**
 * Get content from a file or item with metadata
 * @param item Item information including id, name and path
 * @returns Formatted content with metadata
 */
export async function getItemContent(item: {
  id: string;
  name: string;
  path: string;
}): Promise<string> {
  try {
    // This might be a file ID rather than a path in some cases
    // First, check if it's a valid file path
    let isActualPath = false;
    try {
      isActualPath = await doesPathExist(item.path);
    } catch (error) {
      console.log(`${item.path} is not a valid file path, might be a file ID`);
    }

    if (isActualPath && !isEmbeddingCandidate(item.path)) {
      return '';
    }

    let content = `Name: ${item.name}\n\n`;

    if (isActualPath) {
      try {
        const fileContent = await extractFileContent({
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

/**
 * Convert a browser File object to Base64
 * Used for electron main process to read file content
 * @param path The path to the file
 * @returns Base64 encoded content
 */
export const filePathConversionProcedure = publicProcedure
  .input(
    z.object({
      path: z.string(),
      fileName: z.string(),
    })
  )
  .query(async ({ input }) => {
    try {
      return await extractFileContent(input);
    } catch (error) {
      console.error('Error converting file:', error);
      throw error;
    }
  });

/**
 * Get all items in a folder recursively
 * @param parentDir Parent directory path
 * @returns Array of items with name, path and type
 */
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
