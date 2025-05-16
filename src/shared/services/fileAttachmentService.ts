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
      const fileType = input.fileName.split('.').pop() as string;
      if (supportedTextFileTypes.includes(fileType)) {
        return await readFileAsText(input.path);
      } else if (fileType === 'pdf') {
        return await convertPdfToText(input.path);
      } else if (fileType === 'xlsx' || fileType === 'xls') {
        const data = xlsx.parse(input.path);
        if (data.length > 0) {
          return data[0].data.map((row: any) => row.join(',')).join('\n');
        }
        return '';
      } else if (supportedDocumentFileTypes.includes(fileType)) {
        const text = await officeParser.parseOfficeAsync(input.path);
        return text;
      } else if (fileType === 'doc' || fileType === 'ppt') {
        const extractor = new WordExtractor();
        const text = await extractor.extract(input.path);
        const body = text.getBody();
        if (body) return body;
      }
      return '';
    } catch (error) {
      console.error('Error converting file to b:', error);
      throw error;
    }
  });

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
