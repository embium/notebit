import { router, publicProcedure } from '@shared/trpc';
import { z } from 'zod';
import {
  getItemContent,
  clearCollection,
  deleteDocumentVectors,
  indexFile,
  searchBySimilarity,
  getFolderItemsRecursive,
} from '@shared/services/smartHubsVectorService';
import path from 'path';
import fs from 'fs';
import neo4jService from '../services/neo4jService';
import smartHubsKnowledgeGraphService from '../services/smartHubsKnowledgeGraphService';
import { EntityType } from '../services/entityExtractor';

// Import electron dialog conditionally in main process only
let dialog: any;
// Check if we're in Electron main process
if (
  typeof process !== 'undefined' &&
  process.versions &&
  process.versions.electron
) {
  // Only import in main process (Electron)
  const electron = require('electron');
  dialog = electron.dialog;
}

/**
 * Schema for file items within Smart Hubs
 */
const FileSchema = z.object({
  id: z.string(),
  name: z.string(),
  path: z.string(),
});

// Type for Smart Hub database
export type FileType = z.infer<typeof FileSchema>;

/**
 * Router for Smart Hub related endpoints, particularly focused on vector search functionality
 * Manages file selection, content retrieval, and semantic search across external documents
 */
export const smartHubsRouter = router({
  /**
   * Retrieves content from a file item in a Smart Hub
   */
  getItemContent: publicProcedure
    .input(
      z.object({
        item: FileSchema,
      })
    )
    .query(async ({ input }) => {
      try {
        // Use the file attachment service to get content
        return await getItemContent(input.item);
      } catch (error) {
        console.error(
          `Error getting content for smart hub ${input.item.id}:`,
          error
        );
        return '';
      }
    }),

  /**
   * Recursively retrieves all items in a folder for Smart Hub indexing
   */
  getFolderItemsRecursive: publicProcedure
    .input(z.object({ path: z.string() }))
    .query(async ({ input }) => {
      try {
        return await getFolderItemsRecursive(input.path);
      } catch (error) {
        console.error(`Error getting folder items from ${input.path}:`, error);
        return [];
      }
    }),

  /**
   * Search Smart Hubs by semantic similarity to query embedding
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
      try {
        // Search across selected smart hubs using the consolidated service
        return await searchBySimilarity(
          input.queryEmbedding,
          input.limit,
          input.ids,
          input.similarityThreshold
        );
      } catch (error) {
        console.error('Error in semantic search operation:', error);
        return [];
      }
    }),

  /**
   * Index a file in a Smart Hub for vector search
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
      try {
        return await indexFile(
          input.itemId,
          input.smartHubId,
          input.embedding,
          input.forceReindex
        );
      } catch (error) {
        console.error(`Error indexing file ${input.itemId}:`, error);
        return false;
      }
    }),

  /**
   * Delete all vector embeddings for a specific Smart Hub collection
   */
  clearCollection: publicProcedure
    .input(z.string())
    .mutation(async ({ input }) => {
      try {
        return await clearCollection(input);
      } catch (error) {
        console.error(`Error clearing collection ${input}:`, error);
        return false;
      }
    }),

  /**
   * Delete vectors for a specific document in a Smart Hub
   */
  deleteDocumentVectors: publicProcedure
    .input(
      z.object({
        smartHubId: z.string(),
        itemId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        return await deleteDocumentVectors(input.smartHubId, input.itemId);
      } catch (error) {
        console.error(
          `Error deleting vectors for document ${input.itemId} in Smart Hub ${input.smartHubId}:`,
          error
        );
        return false;
      }
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
      try {
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
      } catch (error) {
        console.error('Error selecting files:', error);
        return [];
      }
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
      try {
        if (!dialog) {
          throw new Error(
            'Folder dialog is only available in the main process'
          );
        }

        const result = await dialog.showOpenDialog({
          properties: ['openDirectory'],
          title: input.title,
        });

        if (!result.canceled && result.filePaths?.[0]) {
          return result.filePaths[0];
        }

        return null;
      } catch (error) {
        console.error('Error selecting folder:', error);
        return null;
      }
    }),

  /**
   * Configure Neo4j connection for knowledge graph
   */
  configureNeo4j: publicProcedure
    .input(
      z.object({
        uri: z.string(),
        username: z.string(),
        password: z.string(),
        database: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const success = await neo4jService.configure(
          input.uri,
          input.username,
          input.password,
          input.database
        );
        return success;
      } catch (error) {
        console.error('Error configuring Neo4j:', error);
        return false;
      }
    }),

  /**
   * Index document with knowledge graph capabilities
   */
  indexDocumentWithKnowledgeGraph: publicProcedure
    .input(
      z.object({
        smartHubId: z.string(),
        itemId: z.string(),
        embedding: z.array(z.number()),
        content: z.string(),
        metadata: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        return await smartHubsKnowledgeGraphService.indexDocumentWithKnowledgeGraph(
          input.itemId,
          input.smartHubId,
          input.content,
          input.embedding,
          input.metadata || {}
        );
      } catch (error) {
        console.error(
          `Error indexing document ${input.itemId} with knowledge graph:`,
          error
        );
        return false;
      }
    }),

  /**
   * Build knowledge graph relationships for a Smart Hub
   */
  buildKnowledgeGraphRelationships: publicProcedure
    .input(
      z.object({
        smartHubId: z.string(),
        similarityThreshold: z.number().min(0).max(1).optional().default(0.7),
        limit: z.number().optional().default(5),
      })
    )
    .mutation(async ({ input }) => {
      try {
        return await smartHubsKnowledgeGraphService.buildKnowledgeGraphRelationships(
          input.smartHubId,
          input.similarityThreshold,
          input.limit
        );
      } catch (error) {
        console.error(
          `Error building knowledge graph relationships for ${input.smartHubId}:`,
          error
        );
        return false;
      }
    }),

  /**
   * Hybrid search combining vector similarity and graph traversal
   */
  hybridSearch: publicProcedure
    .input(
      z.object({
        queryEmbedding: z.array(z.number()),
        smartHubIds: z.array(z.string()),
        similarityThreshold: z.number().min(0).max(1).optional().default(0.7),
        limit: z.number().optional().default(5),
        graphDepth: z.number().optional().default(2),
        graphResultCount: z.number().optional().default(5),
      })
    )
    .query(async ({ input }) => {
      try {
        const results = await smartHubsKnowledgeGraphService.hybridSearch(
          input.queryEmbedding,
          input.smartHubIds,
          input.similarityThreshold,
          input.limit,
          input.graphDepth,
          input.graphResultCount
        );

        return results;
      } catch (error) {
        console.error('Error performing hybrid search:', error);
        return [];
      }
    }),

  /**
   * Get content for hybrid search results
   */
  getHybridSearchContents: publicProcedure
    .input(
      z.array(
        z.object({
          documentId: z.string(),
          smartHubId: z.string(),
          score: z.number(),
          isGraphResult: z.boolean().optional(),
        })
      )
    )
    .query(async ({ input }) => {
      try {
        return await smartHubsKnowledgeGraphService.getHybridSearchContents(
          input
        );
      } catch (error) {
        console.error('Error getting hybrid search contents:', error);
        return [];
      }
    }),

  extractDocumentEntities: publicProcedure
    .input(
      z.object({
        documentId: z.string(),
        smartHubId: z.string(),
        content: z.string(),
        entityTypes: z
          .array(
            z.enum([
              'Person',
              'Organization',
              'Location',
              'Date',
              'Concept',
              'Technology',
            ])
          )
          .optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { documentId, content, entityTypes } = input;
      return await neo4jService.extractEntities(
        documentId,
        content,
        entityTypes as EntityType[]
      );
    }),

  /**
   * Find entities related to documents in a smart hub
   */
  findRelatedEntities: publicProcedure
    .input(
      z.object({
        smartHubId: z.string(),
        entityType: z.enum([
          'Person',
          'Organization',
          'Location',
          'Date',
          'Concept',
        ]),
        limit: z.number().optional().default(10),
      })
    )
    .query(async ({ input }) => {
      try {
        return await neo4jService.findRelatedEntities(
          input.smartHubId,
          input.entityType,
          input.limit
        );
      } catch (error) {
        console.error(
          `Error finding ${input.entityType} entities in smart hub ${input.smartHubId}:`,
          error
        );
        return [];
      }
    }),

  /**
   * Delete a document from the knowledge graph
   */
  deleteDocumentFromKnowledgeGraph: publicProcedure
    .input(
      z.object({
        smartHubId: z.string(),
        documentId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        return await smartHubsKnowledgeGraphService.deleteDocumentFromKnowledgeGraph(
          input.documentId,
          input.smartHubId
        );
      } catch (error) {
        console.error(
          `Error deleting document ${input.documentId} from knowledge graph:`,
          error
        );
        return false;
      }
    }),

  /**
   * Delete an entire smart hub from the knowledge graph
   */
  deleteSmartHubFromKnowledgeGraph: publicProcedure
    .input(z.string())
    .mutation(async ({ input }) => {
      try {
        return await smartHubsKnowledgeGraphService.deleteSmartHubFromKnowledgeGraph(
          input
        );
      } catch (error) {
        console.error(
          `Error deleting smart hub ${input} from knowledge graph:`,
          error
        );
        return false;
      }
    }),
});
