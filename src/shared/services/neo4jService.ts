import neo4j, { Driver, Session } from 'neo4j-driver';
import path from 'path';
import fs from 'fs';
import entityExtractor, { EntityType } from './entityExtractor';

// Define a type for simple metadata to avoid Neo4j driver type conflicts
interface SimpleMetadata {
  [key: string]: string;
}

/**
 * Service for Neo4j graph database integration with vector search
 * Manages connections and operations for the knowledge graph
 */
export class Neo4jService {
  private static instance: Neo4jService;
  private driver: Driver | null = null;
  private connectionConfig: {
    uri: string;
    username: string;
    password: string;
    database?: string;
  } | null = null;
  private configPath: string;

  private constructor() {
    // Use process directly instead of app from electron
    const userDataPath =
      process.env.APPDATA ||
      (process.platform === 'darwin'
        ? process.env.HOME + '/Library/Application Support'
        : process.env.HOME + '/.local/share');
    this.configPath = path.join(userDataPath, 'notebit', 'neo4j_config.json');
    this.loadConfig();
  }

  /**
   * Returns the singleton instance of Neo4jService
   */
  public static getInstance(): Neo4jService {
    if (!Neo4jService.instance) {
      Neo4jService.instance = new Neo4jService();
    }
    return Neo4jService.instance;
  }

  /**
   * Load Neo4j connection configuration from disk
   */
  private loadConfig(): void {
    try {
      if (fs.existsSync(this.configPath)) {
        const configData = fs.readFileSync(this.configPath, 'utf8');
        this.connectionConfig = JSON.parse(configData);
        console.log('Loaded Neo4j configuration');
      } else {
        console.log('No Neo4j configuration found');
      }
    } catch (error) {
      console.error('Error loading Neo4j configuration:', error);
    }
  }

  /**
   * Save Neo4j connection configuration to disk
   */
  private saveConfig(): void {
    try {
      if (this.connectionConfig) {
        // Ensure directory exists
        const dirPath = path.dirname(this.configPath);
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
        }

        fs.writeFileSync(
          this.configPath,
          JSON.stringify(this.connectionConfig, null, 2)
        );
      }
    } catch (error) {
      console.error('Error saving Neo4j configuration:', error);
    }
  }

  /**
   * Configure Neo4j connection
   * @param uri Neo4j connection URI
   * @param username Neo4j username
   * @param password Neo4j password
   * @param database Optional database name
   */
  public async configure(
    uri: string,
    username: string,
    password: string,
    database?: string
  ): Promise<boolean> {
    try {
      // Close any existing connection
      await this.disconnect();

      this.connectionConfig = { uri, username, password, database };
      this.saveConfig();

      // Test the connection
      return await this.connect();
    } catch (error) {
      console.error('Error configuring Neo4j connection:', error);
      return false;
    }
  }

  /**
   * Connect to Neo4j database
   */
  public async connect(): Promise<boolean> {
    try {
      if (!this.connectionConfig) {
        console.error('Neo4j not configured');
        return false;
      }

      if (this.driver) {
        // Already connected
        return true;
      }

      const { uri, username, password } = this.connectionConfig;
      this.driver = neo4j.driver(uri, neo4j.auth.basic(username, password));

      // Verify connection
      const session = this.driver.session();
      await session.run('RETURN 1 AS test');
      await session.close();

      return true;
    } catch (error) {
      console.error('Error connecting to Neo4j:', error);
      this.driver = null;
      return false;
    }
  }

  /**
   * Disconnect from Neo4j database
   */
  public async disconnect(): Promise<void> {
    if (this.driver) {
      await this.driver.close();
      this.driver = null;
    }
  }

  /**
   * Get a Neo4j session
   */
  public getSession(): Session {
    if (!this.driver) {
      throw new Error('Not connected to Neo4j');
    }
    return this.driver.session({
      database: this.connectionConfig?.database,
    });
  }

  /**
   * Check if connected to Neo4j
   */
  public isConnected(): boolean {
    return this.driver !== null;
  }

  /**
   * Index a document from a SmartHub in Neo4j as a node
   * @param documentId ID of the document
   * @param smartHubId ID of the smart hub
   * @param metadata Document metadata
   * @param embedding Vector embedding for the document
   */
  public async indexDocument(
    documentId: string,
    smartHubId: string,
    metadata: Record<string, any>,
    embedding: number[]
  ): Promise<boolean> {
    if (!this.isConnected() && !(await this.connect())) {
      return false;
    }

    const session = this.getSession();
    try {
      // Store document as a node in Neo4j
      // Convert metadata to proper format (string properties only)
      const properties: SimpleMetadata = {};

      // Convert all metadata to strings for Neo4j compatibility
      for (const [key, value] of Object.entries(metadata)) {
        if (
          typeof value === 'string' ||
          typeof value === 'number' ||
          typeof value === 'boolean'
        ) {
          properties[key] = String(value);
        }
      }

      // Add required properties
      properties.documentId = documentId;
      properties.smartHubId = smartHubId;

      // Create or update document node
      await session.run(
        `
        MERGE (d:Document {documentId: $documentId})
        SET d += $properties
        WITH d
        MERGE (h:SmartHub {smartHubId: $smartHubId})
        MERGE (d)-[:BELONGS_TO]->(h)
        RETURN d
        `,
        { documentId, smartHubId, properties }
      );

      console.log(`Indexed document ${documentId} in Neo4j`);
      return true;
    } catch (error) {
      console.error('Error indexing document in Neo4j:', error);
      return false;
    } finally {
      await session.close();
    }
  }

  /**
   * Create a relationship between documents based on similarity
   * @param sourceDocId Source document ID
   * @param targetDocId Target document ID
   * @param similarityScore Similarity score between documents
   * @param relationshipType Type of relationship
   */
  public async createRelationship(
    sourceDocId: string,
    targetDocId: string,
    similarityScore: number,
    relationshipType: string = 'SIMILAR_TO'
  ): Promise<boolean> {
    if (!this.isConnected() && !(await this.connect())) {
      return false;
    }

    const session = this.getSession();
    try {
      await session.run(
        `
        MATCH (source:Document {documentId: $sourceDocId})
        MATCH (target:Document {documentId: $targetDocId})
        MERGE (source)-[r:${relationshipType}]->(target)
        SET r.score = $similarityScore
        RETURN r
        `,
        { sourceDocId, targetDocId, similarityScore }
      );

      console.log(
        `Created relationship ${relationshipType} from ${sourceDocId} to ${targetDocId}`
      );
      return true;
    } catch (error) {
      console.error('Error creating relationship in Neo4j:', error);
      return false;
    } finally {
      await session.close();
    }
  }

  /**
   * Find related documents through graph traversal
   * @param documentId Starting document ID
   * @param depth Traversal depth (default: 2)
   * @param minSimilarity Minimum similarity score (default: 0.7)
   * @param limit Maximum number of results
   */
  public async findRelatedDocuments(
    documentId: string,
    depth: number = 2,
    minSimilarity: number = 0.7,
    limit: number = 10
  ): Promise<Array<{ documentId: string; smartHubId: string; score: number }>> {
    if (!this.isConnected() && !(await this.connect())) {
      return [];
    }

    const session = this.getSession();
    try {
      const result = await session.run(
        `
        MATCH (source:Document {documentId: $documentId})
        MATCH path = (source)-[r:SIMILAR_TO*1..${depth}]-(related:Document)
        WHERE all(rel IN relationships(path) WHERE rel.score >= $minSimilarity)
        WITH related, source,
             reduce(score = 1.0, rel IN relationships(path) | score * rel.score) AS totalScore
        RETURN related.documentId AS documentId, 
               related.smartHubId AS smartHubId,
               totalScore AS score
        ORDER BY score DESC
        LIMIT $limit
        `,
        { documentId, minSimilarity, limit }
      );

      // Convert the Neo4j records to plain objects using explicit casting
      return result.records.map((record) => {
        const docId = record.get('documentId') as string;
        const hubId = record.get('smartHubId') as string;
        const scoreVal = record.get('score') as number;

        return {
          documentId: docId,
          smartHubId: hubId,
          score: scoreVal,
        };
      });
    } catch (error) {
      console.error('Error finding related documents in Neo4j:', error);
      return [];
    } finally {
      await session.close();
    }
  }

  /**
   * Extract entities from document content and create nodes and relationships
   * @param documentId Document ID
   * @param content Document content
   * @param entityTypes Array of entity types to extract (e.g., ['Person', 'Organization'])
   */
  public async extractEntities(
    documentId: string,
    content: string,
    entityTypes: EntityType[] = [
      'Person',
      'Organization',
      'Location',
      'Date',
      'Concept',
    ]
  ): Promise<boolean> {
    if (!this.isConnected() && !(await this.connect())) {
      return false;
    }

    try {
      // Extract entities using the entity extractor
      const extractedEntities = await entityExtractor.extractEntities(
        content,
        entityTypes
      );

      if (extractedEntities.length === 0) {
        console.log(`No entities found in document ${documentId}`);
        return true;
      }

      console.log(
        `Found ${extractedEntities.length} entities in document ${documentId}`
      );

      const session = this.getSession();
      try {
        // Create entity nodes and relationships in Neo4j
        for (const entity of extractedEntities) {
          // Only process entities with sufficient confidence
          if (entity.confidence >= 0.6) {
            await session.run(
              `
              MATCH (d:Document {documentId: $documentId})
              MERGE (e:${entity.type} {name: $name})
              MERGE (d)-[r:MENTIONS]->(e)
              SET r.confidence = $confidence,
                  r.mentions = $mentions
              RETURN e
              `,
              {
                documentId,
                name: entity.name,
                confidence: entity.confidence,
                mentions: entity.mentions,
              }
            );
          }
        }

        console.log(
          `Extracted and stored entities from document ${documentId}`
        );
        return true;
      } finally {
        await session.close();
      }
    } catch (error) {
      console.error('Error extracting entities in Neo4j:', error);
      return false;
    }
  }

  /**
   * Find entities related to documents in a smart hub
   * @param smartHubId ID of the smart hub
   * @param entityType Type of entity to find (e.g., 'Person', 'Organization')
   * @param limit Maximum number of results
   */
  public async findRelatedEntities(
    smartHubId: string,
    entityType: string,
    limit: number = 10
  ): Promise<
    Array<{ entity: string; documentIds: string[]; confidence: number }>
  > {
    if (!this.isConnected() && !(await this.connect())) {
      return [];
    }

    const session = this.getSession();
    try {
      const result = await session.run(
        `
        MATCH (h:SmartHub {smartHubId: $smartHubId})<-[:BELONGS_TO]-(d:Document)
        MATCH (d)-[r:MENTIONS]->(e:${entityType})
        WITH e.name AS entity, collect(d.documentId) AS documentIds, avg(r.confidence) AS confidence
        RETURN entity, documentIds, confidence
        ORDER BY confidence DESC, size(documentIds) DESC
        LIMIT $limit
        `,
        { smartHubId, limit }
      );

      // Convert the Neo4j records to plain objects using explicit casting
      return result.records.map((record) => {
        const entityName = record.get('entity') as string;
        const docIds = record.get('documentIds') as string[];
        const conf = record.get('confidence') as number;

        return {
          entity: entityName,
          documentIds: docIds,
          confidence: conf,
        };
      });
    } catch (error) {
      console.error(
        `Error finding ${entityType} entities in smart hub ${smartHubId}:`,
        error
      );
      return [];
    } finally {
      await session.close();
    }
  }

  /**
   * Delete a document and all its relationships from the graph
   * @param documentId ID of the document to delete
   */
  public async deleteDocument(documentId: string): Promise<boolean> {
    if (!this.isConnected() && !(await this.connect())) {
      return false;
    }

    const session = this.getSession();
    try {
      // Delete the document node and all its relationships
      await session.run(
        `
        MATCH (d:Document {documentId: $documentId})
        OPTIONAL MATCH (d)-[r]-()
        DELETE r, d
        `,
        { documentId }
      );

      console.log(`Deleted document ${documentId} from Neo4j knowledge graph`);
      return true;
    } catch (error) {
      console.error('Error deleting document from Neo4j:', error);
      return false;
    } finally {
      await session.close();
    }
  }

  /**
   * Delete all documents belonging to a smart hub
   * @param smartHubId ID of the smart hub
   */
  public async deleteSmartHubDocuments(smartHubId: string): Promise<boolean> {
    if (!this.isConnected() && !(await this.connect())) {
      return false;
    }

    const session = this.getSession();
    try {
      // Delete all documents belonging to the smart hub and their relationships
      await session.run(
        `
        MATCH (h:SmartHub {smartHubId: $smartHubId})<-[:BELONGS_TO]-(d:Document)
        OPTIONAL MATCH (d)-[r]-()
        DELETE r, d
        WITH h
        OPTIONAL MATCH (h)-[r2]-()
        DELETE r2, h
        `,
        { smartHubId }
      );

      console.log(
        `Deleted all documents for smart hub ${smartHubId} from Neo4j knowledge graph`
      );
      return true;
    } catch (error) {
      console.error(
        `Error deleting documents for smart hub ${smartHubId} from Neo4j:`,
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
