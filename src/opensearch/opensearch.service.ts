import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@opensearch-project/opensearch';

interface OpenSearchSource {
  raw_text: string;
  source_url: string;
  metadata: Record<string, unknown>;
}

interface OpenSearchHit {
  _source: OpenSearchSource;
  _score: number;
}

interface OpenSearchResponse {
  body: {
    hits: {
      hits: OpenSearchHit[];
    };
  };
}

@Injectable()
export class OpenSearchService implements OnModuleInit {
  private readonly logger = new Logger(OpenSearchService.name);
  private client: Client | null = null;
  private isAvailable = false;

  constructor(private configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const url = this.configService.get<string>('OPENSEARCH_URL');
    if (!url) {
      this.logger.error('OPENSEARCH_URL not configured. OpenSearch features will be unavailable.');
      return;
    }

    try {
      this.client = new Client({
        node: url,
        requestTimeout: 5000, // 5s timeout as per requirements
      });
      
      // Ping to check availability
      await this.client.ping();
      this.isAvailable = true;
      this.logger.log('OpenSearch client connected successfully.');
    } catch (error) {
      this.logger.error('Could not connect to OpenSearch. Falling back to mock data.', error);
      this.isAvailable = false;
    }
  }

  /**
   * Performs hybrid search (lexical + vector)
   */
  async hybridSearch(query: string, topK = 5): Promise<unknown[]> {
    if (!this.isAvailable || !this.client) {
      throw new Error('OpenSearch unavailable');
    }

    const index = this.configService.get<string>('OPENSEARCH_INDEX') ?? 'enterprise_docs';

    // Simplified hybrid query for the purpose of this implementation
    // Combining match (BM25) and a placeholder for k-NN
    const response = (await this.client.search({
      index,
      body: {
        size: topK,
        query: {
          bool: {
            should: [
              { match: { raw_text: query } },
              // In a real k-NN scenario, we would add the knn vector search clause here
              // Example: { knn: { text_vector: { vector: [...], k: topK } } }
            ],
          },
        },
      },
    })) as OpenSearchResponse;

    return response.body.hits.hits.map((hit) => ({
      text: hit._source.raw_text,
      relevance_score: hit._score,
      source_url: hit._source.source_url,
      metadata: hit._source.metadata,
    }));
  }

  getAvailability(): boolean {
    return this.isAvailable;
  }
}
