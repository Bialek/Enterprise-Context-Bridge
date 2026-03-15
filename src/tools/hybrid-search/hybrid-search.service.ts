import { Injectable, Logger } from '@nestjs/common';
import { OpenSearchService } from '../../opensearch/opensearch.service';
import * as fs from 'fs';
import * as path from 'path';

export interface HybridSearchParams {
  query: string;
  top_k?: number;
}

interface MockDoc {
  title: string;
  text: string;
  url: string;
  metadata: Record<string, unknown>;
}

@Injectable()
export class HybridSearchService {
  private readonly logger = new Logger(HybridSearchService.name);
  private mockDocs: MockDoc[] = [];

  constructor(private openSearchService: OpenSearchService) {
    this.loadMockDocs();
  }

  private loadMockDocs(): void {
    try {
      const dataPath = path.join(process.cwd(), 'data', 'mock-docs.json');
      const raw = fs.readFileSync(dataPath, 'utf-8');
      this.mockDocs = JSON.parse(raw) as MockDoc[];
    } catch (e) {
      this.logger.error('Failed to load mock docs', e);
    }
  }

  /**
   * Search across OpenSearch. Falls back to mock JSON if unavailable.
   */
  async searchDocs(params: HybridSearchParams): Promise<unknown> {
    const topK = params.top_k ?? 5;

    if (this.openSearchService.getAvailability()) {
      try {
        return await this.openSearchService.hybridSearch(params.query, topK);
      } catch (e) {
        this.logger.warn('OpenSearch query failed, falling back to mock search.', e);
      }
    }

    // Fallback: Simple keyword match on mock data
    this.logger.warn('Using mock data for hybrid search tool');
    const queryTerms = params.query.toLowerCase().split(/\s+/);
    
    // Sort docs by how many terms match their text/title
    const scoredDocs = this.mockDocs.map(doc => {
      const textToSearch = `${doc.title} ${doc.text}`.toLowerCase();
      let score = 0;
      for (const term of queryTerms) {
        if (textToSearch.includes(term)) {
          score += 1;
        }
      }
      return { doc, score };
    });

    // Filter by score > 0, sort descending, grab topK
    const results = scoredDocs
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map(item => ({
        text: item.doc.text,
        relevance_score: item.score,
        source_url: item.doc.url,
        metadata: item.doc.metadata,
      }));

    if (results.length === 0) {
      return { message: "Context Unavailable. No matching mock documents found." };
    }

    return results;
  }
}
