import { router, publicProcedure } from '@shared/trpc';
import {
  filePathConversionProcedure,
  extractFileContent,
  readFileAsBase64,
  readFileAsText,
} from '../services/fileAttachmentService';
import { z } from 'zod';

/**
 * Router for file attachment operations
 * Provides utilities for reading and processing files in various formats
 */
export const fileAttachmentsRouter = router({
  /**
   * Reads file content as text or extracts content based on file type
   * Uses specialized extractors for PDFs, Office documents, and other formats
   */
  getFileContent: filePathConversionProcedure,

  /**
   * Reads a file and returns its contents as base64 encoded string
   * Useful for binary files and image attachments
   */
  getFileContentAsBase64: publicProcedure
    .input(
      z.object({
        path: z.string(),
      })
    )
    .query(async ({ input }) => {
      try {
        return await readFileAsBase64(input.path);
      } catch (error) {
        console.error(`Error reading file as base64: ${input.path}`, error);
        throw error;
      }
    }),

  /**
   * Reads a file and returns its contents as text
   * Optimized for text files with UTF-8 encoding
   */
  getFileContentAsText: publicProcedure
    .input(
      z.object({
        path: z.string(),
      })
    )
    .query(async ({ input }) => {
      try {
        return await readFileAsText(input.path);
      } catch (error) {
        console.error(`Error reading file as text: ${input.path}`, error);
        return '';
      }
    }),
});
