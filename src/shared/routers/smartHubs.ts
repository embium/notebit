import { router, publicProcedure } from '@shared/trpc';
import { z } from 'zod';
import {
  getItemContent,
  searchBySimilarity,
  indexFile,
  clearCollection,
  deleteDocumentVectors,
  getFolderItemsRecursive,
} from '@shared/services/smartHubsVectorService';
import path from 'path';
import fs from 'fs';
import { getNoteContent } from '../services/notesFileService';

// Import electron dialog conditionally in main process only
let dialog: any;
if (process.type === 'browser') {
  // Only import in main process (Electron)
  const electron = require('electron');
  dialog = electron.dialog;
}

// Define Smart Hub schema for consistent typing
const FileSchema = z.object({
  id: z.string(),
  name: z.string(),
  path: z.string(),
});

// Type for Smart Hub database
export type FileType = z.infer<typeof FileSchema>;

/**
 * Router for Smart Hub related endpoints, particularly focused on vector search functionality
 */
export const smartHubsRouter = router({
  getItemContent: publicProcedure
    .input(
      z.object({
        item: FileSchema,
      })
    )
    .query(async ({ input }) => {
      try {
        // Use the existing function to get the content for the smart hub
        return await getItemContent(input.item);
      } catch (error) {
        console.error(
          `Error getting content for smart hub ${input.item.id}:`,
          error
        );
        return '';
      }
    }),

  getFolderItemsRecursive: publicProcedure
    .input(z.object({ path: z.string() }))
    .query(async ({ input }) => {
      return getFolderItemsRecursive(input.path);
    }),

  /**
   * Search Smart Hubs by semantic similarity to query
   */
  searchBySimilarity: publicProcedure
    .input(
      z.object({
        queryEmbedding: z.array(z.number()),
        limit: z.number().optional().default(10),
        ids: z.array(z.string()),
        similarityThreshold: z.number().optional().default(0.5),
      })
    )
    .query(async ({ input }) => {
      // If ids are provided, pass them to the search function
      const results = await searchBySimilarity(
        input.queryEmbedding,
        input.limit,
        input.ids,
        input.similarityThreshold
      );

      return results;
    }),

  /**
   * Index Smart Hubs for vector search
   */
  indexFile: publicProcedure
    .input(
      z.object({
        smartHubId: z.string(),
        itemId: z.string(),
        embedding: z.array(z.number()),
        forceReindex: z.boolean().optional().default(false),
      })
    )
    .mutation(async ({ input }) => {
      return indexFile(
        input.itemId,
        input.smartHubId,
        input.embedding,
        input.forceReindex
      );
    }),

  /**
   * Delete vector embeddings for a specific Smart Hub
   */
  clearCollection: publicProcedure
    .input(z.string())
    .mutation(async ({ input }) => {
      return clearCollection(input);
    }),

  deleteDocumentVectors: publicProcedure
    .input(
      z.object({
        smartHubId: z.string(),
        itemId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      return deleteDocumentVectors(input.smartHubId, input.itemId);
    }),

  /**
   * Open file selection dialog to browse for files to add to a Smart Hub
   */
  selectFiles: publicProcedure
    .input(
      z.object({
        filters: z
          .array(
            z.object({
              name: z.string(),
              extensions: z.array(z.string()),
            })
          )
          .optional(),
        title: z.string().optional().default('Select Files for Smart Hub'),
      })
    )
    .mutation(async ({ input }) => {
      if (!dialog) {
        throw new Error('File dialog is only available in the main process');
      }

      const result = await dialog.showOpenDialog({
        properties: ['openFile', 'multiSelections'],
        title: input.title,
        filters: input.filters || [
          {
            name: 'Text Files',
            extensions: ['txt', 'md', 'json', 'jsonl', 'csv'],
          },
          { name: 'Documents', extensions: ['pdf', 'docx', 'rtf', 'epub'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });

      if (!result.canceled && result.filePaths?.length) {
        // Process file paths in the main process to avoid using path in renderer
        return result.filePaths.map((filePath: string) => {
          const name = path.basename(filePath);
          const fileType = path.extname(filePath).slice(1).toLowerCase();
          let size = 0;

          try {
            const stats = fs.statSync(filePath);
            size = stats.size;
          } catch (error) {
            console.error(`Error getting file size for ${filePath}:`, error);
          }

          return {
            path: filePath,
            name,
            fileType,
            size,
          };
        });
      }

      return [];
    }),

  /**
   * Open folder selection dialog to browse for folders to add to a Smart Hub
   */
  selectFolder: publicProcedure
    .input(
      z.object({
        title: z.string().optional().default('Select Folder for Smart Hub'),
      })
    )
    .mutation(async ({ input }) => {
      if (!dialog) {
        throw new Error('Folder dialog is only available in the main process');
      }

      const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
        title: input.title,
      });

      if (!result.canceled && result.filePaths?.[0]) {
        return result.filePaths[0];
      }

      return null;
    }),
});
