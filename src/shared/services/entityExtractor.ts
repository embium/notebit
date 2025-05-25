import natural from 'natural';
import nlp from 'compromise';

// Initialize NLP tools
const tokenizer = new natural.WordTokenizer();

/**
 * Entity types supported by the extractor
 */
export type EntityType =
  | 'Person'
  | 'Organization'
  | 'Location'
  | 'Date'
  | 'Concept'
  | 'Technology';

/**
 * Represents an extracted entity
 */
export interface ExtractedEntity {
  type: EntityType;
  name: string;
  confidence: number;
  mentions: number;
}

/**
 * Service for extracting entities from text using NLP techniques
 */
export class EntityExtractor {
  private static instance: EntityExtractor;
  private initialized = false;

  private constructor() {
    // Initialize will be called before first use
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): EntityExtractor {
    if (!EntityExtractor.instance) {
      EntityExtractor.instance = new EntityExtractor();
    }
    return EntityExtractor.instance;
  }

  /**
   * Initialize the NLP models
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // No initialization needed for now
      this.initialized = true;
      console.log('Entity extractor initialized');
    } catch (error) {
      console.error('Error initializing entity extractor:', error);
      throw error;
    }
  }

  /**
   * Extract entities from text content
   * @param text The text content to analyze
   * @param types Types of entities to extract
   * @returns Array of extracted entities
   */
  public async extractEntities(
    text: string,
    types: EntityType[] = [
      'Person',
      'Organization',
      'Location',
      'Date',
      'Concept',
      'Technology',
    ]
  ): Promise<ExtractedEntity[]> {
    // Ensure the extractor is initialized
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const entityMap = new Map<string, ExtractedEntity>();

      // Use compromise for entity extraction
      const doc = nlp(text);

      // Extract people
      if (types.includes('Person')) {
        doc.people().forEach((person: any) => {
          const name = person.text();
          const key = `Person:${name.toLowerCase()}`;

          if (!entityMap.has(key)) {
            entityMap.set(key, {
              type: 'Person',
              name,
              confidence: 0.8,
              mentions: 1,
            });
          }
        });
      }

      // Extract organizations
      if (types.includes('Organization')) {
        doc.organizations().forEach((org: any) => {
          const name = org.text();
          const key = `Organization:${name.toLowerCase()}`;

          if (!entityMap.has(key)) {
            entityMap.set(key, {
              type: 'Organization',
              name,
              confidence: 0.75,
              mentions: 1,
            });
          }
        });
      }

      // Extract places/locations
      if (types.includes('Location')) {
        doc.places().forEach((place: any) => {
          const name = place.text();
          const key = `Location:${name.toLowerCase()}`;

          if (!entityMap.has(key)) {
            entityMap.set(key, {
              type: 'Location',
              name,
              confidence: 0.75,
              mentions: 1,
            });
          }
        });
      }

      // Extract dates - using compromise's date parsing
      if (types.includes('Date')) {
        const dates = doc.match('#Date+');
        dates.forEach((date: any) => {
          const name = date.text();
          const key = `Date:${name.toLowerCase()}`;

          if (!entityMap.has(key)) {
            entityMap.set(key, {
              type: 'Date',
              name,
              confidence: 0.9, // Dates are usually high confidence
              mentions: 1,
            });
          }
        });
      }

      // Extract technology terms (custom logic)
      if (types.includes('Technology')) {
        const techTerms = this.extractTechnologyTerms(text);
        techTerms.forEach((tech) => {
          const key = `Technology:${tech.toLowerCase()}`;

          if (!entityMap.has(key)) {
            entityMap.set(key, {
              type: 'Technology',
              name: tech,
              confidence: 0.6, // Lower confidence for tech terms
              mentions: 1,
            });
          }
        });
      }

      // Extract concepts (nouns that aren't other entity types)
      if (types.includes('Concept')) {
        const nouns = doc.nouns();
        nouns.forEach((noun: any) => {
          const name = noun.text();
          if (name.length > 3) {
            // Filter out short words
            const key = `Concept:${name.toLowerCase()}`;

            if (!entityMap.has(key)) {
              entityMap.set(key, {
                type: 'Concept',
                name,
                // Give higher confidence to important concepts
                confidence: 0.5,
                mentions: 1,
              });
            }
          }
        });
      }

      // Convert map to array and sort by confidence and mentions
      const result = Array.from(entityMap.values()).sort((a, b) => {
        // Sort by confidence first, then by mentions
        if (b.confidence !== a.confidence) {
          return b.confidence - a.confidence;
        }
        return b.mentions - a.mentions;
      });

      return result;
    } catch (error) {
      console.error('Error extracting entities:', error);
      return [];
    }
  }

  /**
   * Extract technology-related terms using custom rules
   * @param text Text to analyze
   * @returns Array of technology terms
   */
  private extractTechnologyTerms(text: string): string[] {
    const techTerms: string[] = [];

    // Helper function to escape special regex characters
    const escapeRegExp = (string: string): string => {
      return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };

    // Common technology keywords
    const techKeywords = [
      'api',
      'framework',
      'library',
      'database',
      'cloud',
      'server',
      'client',
      'app',
      'application',
      'software',
      'hardware',
      'platform',
      'system',
      'programming',
      'language',
      'code',
      'algorithm',
      'function',
      'method',
      'interface',
      'protocol',
      'network',
      'security',
      'encryption',
      'authentication',
      'data',
      'storage',
      'memory',
      'cpu',
      'processor',
      'device',
      'mobile',
      'web',
      'internet',
      'browser',
      'frontend',
      'backend',
      'fullstack',
      'ai',
      'ml',
      'machine learning',
      'neural',
      'deep learning',
      'model',
    ];

    // Common technology names
    const techNames = [
      'javascript',
      'typescript',
      'python',
      'java',
      'c#',
      'c++',
      'ruby',
      'go',
      'react',
      'angular',
      'vue',
      'node',
      'express',
      'django',
      'flask',
      'spring',
      'aws',
      'azure',
      'gcp',
      'docker',
      'kubernetes',
      'terraform',
      'jenkins',
      'mongodb',
      'postgresql',
      'mysql',
      'redis',
      'elasticsearch',
      'neo4j',
      'git',
      'github',
      'gitlab',
      'bitbucket',
      'jira',
      'confluence',
      'linux',
      'windows',
      'macos',
      'ios',
      'android',
      'tensorflow',
      'pytorch',
      'openai',
      'gpt',
      'bert',
      'llm',
    ];

    // Search for tech keywords and names in the text
    const lowerText = text.toLowerCase();

    // Check for tech names (specific technologies)
    for (const tech of techNames) {
      // Escape special regex characters
      const escapedTech = escapeRegExp(tech);
      try {
        const regex = new RegExp(`\\b${escapedTech}\\b`, 'gi');
        if (regex.test(text)) {
          techTerms.push(tech);
        }
      } catch (error) {
        console.error(
          `Error creating regex for technology term "${tech}":`,
          error
        );
        // Continue with other terms even if one fails
      }
    }

    // Extract phrases containing tech keywords
    const sentences = text.split(/[.!?]+/);
    for (const sentence of sentences) {
      for (const keyword of techKeywords) {
        try {
          // Escape special regex characters
          const escapedKeyword = escapeRegExp(keyword);
          const regex = new RegExp(`\\b${escapedKeyword}\\b`, 'i');
          if (regex.test(sentence)) {
            // Extract noun phrases around the keyword
            const words = sentence.split(/\s+/);
            const keywordIndex = words.findIndex((word) =>
              word.toLowerCase().includes(keyword)
            );

            if (keywordIndex >= 0) {
              // Try to extract a meaningful phrase (up to 3 words)
              let phrase = words[keywordIndex];

              // Add preceding word if it looks like an adjective or proper noun
              if (
                keywordIndex > 0 &&
                !words[keywordIndex - 1].match(
                  /^(the|a|an|this|that|these|those|my|your|our|their)$/i
                )
              ) {
                phrase = words[keywordIndex - 1] + ' ' + phrase;
              }

              // Add following word if it looks like it could be part of the phrase
              if (
                keywordIndex < words.length - 1 &&
                !words[keywordIndex + 1].match(
                  /^(is|are|was|were|will|would|could|should|and|or|but)$/i
                )
              ) {
                phrase = phrase + ' ' + words[keywordIndex + 1];
              }

              techTerms.push(phrase.trim());
            }
          }
        } catch (error) {
          console.error(`Error processing keyword "${keyword}":`, error);
          // Continue with other keywords even if one fails
        }
      }
    }

    // Remove duplicates and return
    return [...new Set(techTerms)];
  }
}

// Export singleton instance
const entityExtractor = EntityExtractor.getInstance();
export default entityExtractor;
