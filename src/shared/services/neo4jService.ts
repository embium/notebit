import neo4j, { Driver, Session, Integer } from 'neo4j-driver';
// Removed: import entityExtractor, { EntityType } from './entityExtractor'; // Assuming LLM handles extraction now
import { store } from '@shared/storage';

// Interface for the entity object from your LLM's JSON output
interface LlmExtractedEntity {
  id: string; // Temporary ID like "e1", "e2"
  name: string;
  type: string; // e.g., "CONCEPT", "ORGANIZATION"
  description: string;
  source_text_snippets: string[];
}

// Interface for the overall JSON structure from your LLM
export interface LlmProcessedData {
  document_id: string;
  entities: LlmExtractedEntity[];
  // relationships?: LlmExtractedRelationship[]; // For future expansion
  // claims?: LlmExtractedClaim[]; // For future expansion
}

// You might want to keep this if you have other simple metadata for nodes
interface SimpleMetadata {
  [key: string]: string | number | boolean;
}

export class Neo4jService {
  private static instance: Neo4jService;
  private driver: Driver | null = null;
  private connectionConfig: {
    uri: string;
    username: string;
    password: string;
    database?: string;
  } | null = null;

  private constructor() {
    this.loadConfig();
  }

  public static getInstance(): Neo4jService {
    if (!Neo4jService.instance) {
      Neo4jService.instance = new Neo4jService();
    }
    return Neo4jService.instance;
  }

  private async loadConfig(): Promise<void> {
    // Your existing loadConfig logic
    // Ensure it correctly populates this.connectionConfig
    try {
      const doc = await store.get('legend_state_ai-memory-settings-state');
      if (doc && 'value' in doc) {
        const data = doc.value as {
          value: {
            neo4jUri: string;
            neo4jUsername: string;
            neo4jPassword: string;
          };
        };
        if (data.value && data.value.neo4jUri) {
          this.connectionConfig = {
            uri: data.value.neo4jUri,
            username: data.value.neo4jUsername,
            password: data.value.neo4jPassword,
          };
          console.log('Neo4j config loaded:', this.connectionConfig.uri);
        } else {
          console.error(
            'Neo4j configuration structure is not as expected or is missing.'
          );
        }
      } else {
        console.log('No Neo4j configuration found in store.');
      }
    } catch (error) {
      console.error('Error loading Neo4j configuration', error);
    }
  }

  public async connect(
    uri?: string | null,
    username?: string | null,
    password?: string | null
  ): Promise<boolean> {
    // Your existing connect logic
    try {
      if (this.driver) return true;

      await this.loadConfig(); // Ensure config is loaded

      const connectionUri = uri || this.connectionConfig?.uri;
      const connectionUsername = username || this.connectionConfig?.username;
      const connectionPassword = password || this.connectionConfig?.password;

      if (!connectionUri || !connectionUsername || !connectionPassword) {
        console.error(
          'Missing Neo4j connection parameters. URI:',
          connectionUri,
          'Username:',
          connectionUsername
        );
        return false;
      }

      this.driver = neo4j.driver(
        connectionUri,
        neo4j.auth.basic(connectionUsername, connectionPassword)
      );
      const serverInfo = await this.driver.getServerInfo();
      console.log('Connection established to Neo4j Server:', serverInfo);
      return true;
    } catch (error) {
      console.error('Error connecting to Neo4j:', error);
      this.driver = null;
      return false;
    }
  }

  public async disconnect(): Promise<void> {
    // Your existing disconnect logic
    if (this.driver) {
      await this.driver.close();
      this.driver = null;
      console.log('Disconnected from Neo4j.');
    }
  }

  public getSession(): Session {
    if (!this.driver) {
      throw new Error('Not connected to Neo4j');
    }
    return this.driver.session({
      database: this.connectionConfig?.database,
    });
  }

  public isConnected(): boolean {
    return this.driver !== null;
  }

  /**
   * Creates or updates a Document node.
   * @param documentId Unique ID for the document.
   * @param metadata Additional properties for the document.
   */
  public async ensureDocumentNode(
    documentId: string,
    metadata: Record<string, any> = {}
  ): Promise<boolean> {
    if (!this.isConnected() && !(await this.connect())) {
      console.error('Cannot ensure document node: Neo4j connection failed.');
      return false;
    }
    const session = this.getSession();
    try {
      await session.run(
        `MERGE (d:Document {documentId: $documentId})
         ON CREATE SET d += $metadata, d.createdAt = timestamp()
         ON MATCH SET d += $metadata, d.updatedAt = timestamp()
         RETURN d`,
        { documentId, metadata }
      );
      console.log(`Ensured document node: ${documentId}`);
      return true;
    } catch (error) {
      console.error(`Error ensuring document node ${documentId}:`, error);
      return false;
    } finally {
      await session.close();
    }
  }

  /**
   * Adds or updates the vector embedding for a Document node.
   * @param documentId Unique ID for the document.
   * @param embedding The vector embedding array.
   */
  public async addDocumentEmbedding(
    documentId: string,
    embedding: number[]
  ): Promise<boolean> {
    if (!this.isConnected() && !(await this.connect())) {
      console.error('Cannot add document embedding: Neo4j connection failed.');
      return false;
    }
    const session = this.getSession();
    try {
      // Ensure the document node exists first
      const docExistsResult = await session.run(
        `MATCH (d:Document {documentId: $documentId}) RETURN d`,
        { documentId }
      );
      if (docExistsResult.records.length === 0) {
        console.warn(
          `Document node ${documentId} not found. Creating it before adding embedding.`
        );
        await this.ensureDocumentNode(documentId); // Create with minimal metadata if not exists
      }

      await session.run(
        `MATCH (d:Document {documentId: $documentId})
         SET d.embedding = $embedding, d.embeddingUpdatedAt = timestamp()
         RETURN d`,
        { documentId, embedding }
      );
      console.log(`Added/updated embedding for document: ${documentId}`);
      return true;
    } catch (error) {
      console.error(`Error adding embedding to document ${documentId}:`, error);
      return false;
    } finally {
      await session.close();
    }
  }

  /**
   * Indexes entities extracted by an LLM and links them to a document.
   * @param data The processed data from the LLM containing document_id and entities.
   */
  public async indexProcessedData(
    title: string,
    documentId: string,
    data: LlmProcessedData
  ): Promise<boolean> {
    if (!this.isConnected() && !(await this.connect())) {
      console.error('Cannot index processed data: Neo4j connection failed.');
      return false;
    }

    // First, ensure the document node exists
    await this.ensureDocumentNode(documentId, {
      title: title,
    }); // Using document_id as title for now

    const session = this.getSession();
    try {
      for (const entity of data.entities) {
        // Use the entity type as the label for the node for more specific querying.
        // Ensure entity.type is a safe string for a label (alphanumeric).
        const entityLabel = entity.type.replace(/[^a-zA-Z0-9_]/g, '_'); // Sanitize label

        // MERGE entity based on its name and type to promote reuse of common entities.
        // Store the LLM's temporary ID as a property if needed for reconciliation,
        // but use name & type for the primary MERGE.
        const result = await session.run(
          `
          MERGE (doc:Document {documentId: $documentId})
          MERGE (ent:${entityLabel} {name: $name}) // MERGE or CREATE entity
          ON CREATE SET ent.type = $type, ent.llmTempId = $id, ent.description = $description, ent.source_text_snippets = $snippets, ent.createdAt = timestamp()
          ON MATCH SET ent.description = coalesce($description, ent.description), ent.source_text_snippets = coalesce($snippets, ent.source_text_snippets), ent.updatedAt = timestamp()
          MERGE (doc)-[r:CONTAINS_ENTITY]->(ent) // Create relationship
          RETURN doc, ent, r
          `,
          {
            documentId: documentId,
            id: entity.id, // LLM's temporary ID
            name: entity.name,
            type: entity.type, // Store type as a property as well
            description: entity.description,
            snippets: entity.source_text_snippets,
          }
        );
        // console.log(`Indexed entity "${entity.name}" and linked to document "${data.document_id}"`);
      }
      console.log(
        `Successfully indexed ${data.entities.length} entities for document: ${data.document_id}`
      );
      return true;
    } catch (error) {
      console.error(
        `Error indexing processed data for document ${data.document_id}:`,
        error
      );
      return false;
    } finally {
      await session.close();
    }
  }

  /**
   * Creates vector indexes in Neo4j if they don't already exist.
   * Call this once during application setup or ensure it's run.
   * @param dimension The dimension of your embeddings (e.g., 1536 for OpenAI ada-002).
   */
  public async createVectorIndexes(dimension: number = 1536): Promise<void> {
    if (!this.isConnected() && !(await this.connect())) {
      console.error('Cannot create vector indexes: Neo4j connection failed.');
      return;
    }
    const session = this.getSession();
    try {
      // Index for Document embeddings
      await session.run(`
        CREATE VECTOR INDEX document_embeddings IF NOT EXISTS
        FOR (d:Document) ON (d.embedding)
        OPTIONS {indexConfig: {
          \`vector.dimensions\`: ${dimension},
          \`vector.similarity_function\`: 'cosine'
        }}
      `);
      console.log('Checked/created vector index: document_embeddings');

      // Potentially other indexes for entities if you embed them later
      // await session.run(`
      //   CREATE VECTOR INDEX entity_embeddings IF NOT EXISTS
      //   FOR (e:Entity) ON (e.embedding)
      //   OPTIONS {indexConfig: { \`vector.dimensions\`: ${dimension}, \`vector.similarity_function\`: 'cosine' }}
      // `);
      // console.log("Checked/created vector index: entity_embeddings");
    } catch (error) {
      console.error('Error creating vector indexes:', error);
    } finally {
      await session.close();
    }
  }

  /**
   * Finds similar documents based on a query embedding.
   * @param queryEmbedding The embedding of the query.
   * @param smartHubIds Array of smartHubIds to filter documents.
   * @param similarityThreshold Minimum similarity score (0-1) to include in results.
   * @param total Maximum number of documents to return.
   */
  public async findSimilarDocumentsByEmbedding(
    queryEmbedding: number[],
    smartHubIds: string[],
    similarityThreshold: number,
    total: number
  ): Promise<Array<{ document: any; score: number }>> {
    if (!this.isConnected() && !(await this.connect())) {
      console.log('Cannot find similar documents: Neo4j connection failed.');
      return [];
    }

    // Ensure total is positive
    if (!total || total <= 0) {
      console.log('Total must be a positive number');
      return [];
    }

    const session = this.getSession();
    try {
      // Build the query with smartHubIds filter and similarity threshold
      const query = `
          CALL db.index.vector.queryNodes('document_embeddings', $total, $queryEmbedding)
          YIELD node AS document, score
          WHERE document.smartHubId IN $smartHubIds AND score >= $similarityThreshold
          RETURN document, score
          ORDER BY score DESC
          LIMIT $total
        `;

      const result = await session.run(query, {
        total: Integer.fromNumber(Math.max(1, total)), // Ensure minimum value of 1
        queryEmbedding,
        smartHubIds,
        similarityThreshold,
      });
      return result.records.map((record) => ({
        document: record.get('document').properties,
        score: record.get('score'),
      }));
    } catch (error) {
      console.error('Error finding similar documents by embedding:', error);
      return [];
    } finally {
      await session.close();
    }
  }

  // --- Keeping some of your existing useful methods (adapted or reviewed) ---

  /**
   * Creates a SIMILAR_TO relationship between two documents.
   * (This is separate from entity-based graph building)
   */
  public async createDocumentSimilarityRelationship(
    sourceDocId: string,
    targetDocId: string,
    similarityScore: number
  ): Promise<boolean> {
    // Your existing createRelationship logic, but maybe rename for clarity
    // Ensure it refers to :Document nodes
    if (!this.isConnected() && !(await this.connect())) return false;
    const session = this.getSession();
    try {
      await session.run(
        `
        MATCH (source:Document {documentId: $sourceDocId})
        MATCH (target:Document {documentId: $targetDocId})
        MERGE (source)-[r:SIMILAR_TO]->(target)
        SET r.similarity = $similarityScore
        RETURN r
        `,
        { sourceDocId, targetDocId, similarityScore }
      );
      console.log(
        `Created SIMILAR_TO relationship from ${sourceDocId} to ${targetDocId}`
      );
      return true;
    } catch (error) {
      console.error(
        'Error creating document similarity relationship in Neo4j:',
        error
      );
      return false;
    } finally {
      await session.close();
    }
  }

  /**
   * Finds documents related to a query by first extracting entities from the query
   * and then finding documents in the graph linked to those entities.
   *
   * NOTE: This now requires an external way to get entities from `queryText` (e.g. another LLM call)
   * or you pass pre-extracted entities from the query.
   * For this example, we'll assume `queryEntities` are passed in.
   */
  public async findDocumentsByQueryEntities(
    queryEntities: Array<{ name: string; type: string }>, // Entities extracted from the user's query
    limit: number = 10,
    smartHubIds?: string[] // Optional filter if you still use SmartHubs
  ): Promise<
    Array<{ documentId: string; score: number; smartHubId?: string }>
  > {
    if (!this.isConnected() && !(await this.connect())) return [];
    if (!queryEntities || queryEntities.length === 0) return [];

    const session = this.getSession();
    try {
      // Prepare entity names and types for the query
      const entityParams = queryEntities.map((e) => ({
        name: e.name,
        type: e.type.replace(/[^a-zA-Z0-9_]/g, '_'),
      }));

      // Build a Cypher query that finds documents connected to ANY of the query entities.
      // Score based on how many of the query entities a document is connected to.
      let cypherQuery = `
        UNWIND $entityParams AS queryEntity
        MATCH (doc:Document)-[:CONTAINS_ENTITY]->(ent)
        WHERE ent.name = queryEntity.name AND labels(ent) CONTAINS queryEntity.type
      `;

      // Optional SmartHub filtering
      // If you have a SmartHubID on the Document node, you can filter by it:
      // if (smartHubIds && smartHubIds.length > 0) {
      //   cypherQuery += ` AND doc.smartHubId IN $smartHubIds `;
      // }

      cypherQuery += `
        WITH doc, count(DISTINCT ent) AS relevanceScore
        RETURN doc.documentId AS documentId,
               doc.smartHubId AS smartHubId, // If you have this property
               relevanceScore AS score
        ORDER BY relevanceScore DESC
        LIMIT toInteger($limit)
      `;

      const result = await session.run(cypherQuery, {
        entityParams,
        limit: Integer.fromNumber(limit),
        // smartHubIds: smartHubIds || [], // If using SmartHubs
      });

      return result.records.map((record) => ({
        documentId: record.get('documentId'),
        smartHubId: record.get('smartHubId'), // Will be null if not present
        score: record.get('score').toNumber(), // Neo4j numbers might need conversion
      }));
    } catch (error) {
      console.error(
        'Error finding documents by query entities in Neo4j:',
        error
      );
      return [];
    } finally {
      await session.close();
    }
  }

  // --- Methods to consider removing or significantly refactoring ---
  // - `indexDocument`: Replaced by `ensureDocumentNode` + `addDocumentEmbedding` + `indexProcessedData`.
  // - `extractEntities`: This logic is now upstream with the LLM.
  // - `findRelatedDocuments` (old version based on SIMILAR_TO between documents): Keep if needed for that specific functionality.
  // - `deleteDocument`, `deleteSmartHubDocuments`: Review these to ensure they clean up all new structures
  //   (e.g., if entities are ONLY linked to one document and should be deleted, or if CONTAINS_ENTITY relationships are removed).
  //   For now, a simple document deletion:
  public async deleteDocumentAndContents(documentId: string): Promise<boolean> {
    if (!this.isConnected() && !(await this.connect())) return false;
    const session = this.getSession();
    try {
      // First identify and delete orphaned entities (those only connected to this document)
      await session.run(
        `
        // Find entities connected only to this document
        MATCH (d:Document {documentId: $documentId})-[:CONTAINS_ENTITY]->(e)
        WHERE NOT EXISTS {
          MATCH (other:Document)-[:CONTAINS_ENTITY]->(e)
          WHERE other.documentId <> $documentId
        }
        // Delete those entities
        DETACH DELETE e
        `,
        { documentId }
      );

      // Then detach and delete the document node itself
      await session.run(
        `
        MATCH (d:Document {documentId: $documentId})
        DETACH DELETE d
        `,
        { documentId }
      );

      console.log(
        `Deleted document ${documentId}, its relationships, and orphaned entities`
      );
      return true;
    } catch (error) {
      console.error(
        'Error deleting document and orphaned entities from Neo4j:',
        error
      );
      return false;
    } finally {
      await session.close();
    }
  }

  /**
   * Deletes all documents with the specified smartHubId and any orphaned entities.
   * @param smartHubId The ID of the SmartHub whose documents should be deleted
   * @returns Boolean indicating success
   */
  public async deleteSmartHubDocuments(smartHubId: string): Promise<boolean> {
    if (!this.isConnected() && !(await this.connect())) return false;
    const session = this.getSession();
    try {
      // First identify and delete orphaned entities (those only connected to documents in this SmartHub)
      await session.run(
        `
        // Find entities connected only to documents in this SmartHub
        MATCH (d:Document {smartHubId: $smartHubId})-[:CONTAINS_ENTITY]->(e)
        WHERE NOT EXISTS {
          MATCH (other:Document)-[:CONTAINS_ENTITY]->(e)
          WHERE other.smartHubId <> $smartHubId
        }
        // Delete those entities
        DETACH DELETE e
        `,
        { smartHubId }
      );

      // Then detach and delete all document nodes in this SmartHub
      const result = await session.run(
        `
        MATCH (d:Document {smartHubId: $smartHubId})
        DETACH DELETE d
        RETURN count(d) as deletedCount
        `,
        { smartHubId }
      );

      const deletedCount =
        result.records[0]?.get('deletedCount')?.toNumber() || 0;
      console.log(
        `Deleted ${deletedCount} documents from SmartHub ${smartHubId} and their orphaned entities`
      );
      return true;
    } catch (error) {
      console.error(
        'Error deleting SmartHub documents and orphaned entities from Neo4j:',
        error
      );
      return false;
    } finally {
      await session.close();
    }
  }
}

// Export singleton instance
const neo4jService = Neo4jService.getInstance();
export default neo4jService;
