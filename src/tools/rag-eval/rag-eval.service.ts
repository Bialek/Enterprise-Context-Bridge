import { Injectable } from '@nestjs/common';

export interface RagEvalParams {
  question: string;
  answer: string;
  context: string;
}

@Injectable()
export class RagEvalService {
  /**
   * Evaluates an LLM answer based on question and context.
   * Uses simple token overlap heuristics in pure TypeScript.
   */
  async evaluate(params: RagEvalParams) {
    const questionTokens = this.tokenize(params.question);
    const answerTokens = this.tokenize(params.answer);
    const contextTokens = this.tokenize(params.context);

    // 1. Faithfulness: How much of the answer is supported by the context?
    // Ratio of answer tokens that also appear in the context.
    const faithfulnessScore = this.calculateOverlapRatio(answerTokens, contextTokens);

    // 2. Answer Relevancy: How much does the answer address the question?
    // Ratio of important question tokens addressed in the answer.
    const relevancyScore = this.calculateOverlapRatio(questionTokens, answerTokens);

    // 3. Hallucination Risk: Inverse of Faithfulness
    const hallucinationRisk = 1.0 - faithfulnessScore;

    let verdict = 'Pass';
    if (faithfulnessScore < 0.5 || hallucinationRisk > 0.5) {
      verdict = 'Fail - High Hallucination Risk';
    } else if (relevancyScore < 0.3) {
      verdict = 'Fail - Low Relevancy';
    }

    return {
      faithfulness: parseFloat(faithfulnessScore.toFixed(2)),
      answer_relevancy: parseFloat(relevancyScore.toFixed(2)),
      hallucination_risk: parseFloat(hallucinationRisk.toFixed(2)),
      verdict,
    };
  }

  /**
   * Simple tokenizer for heuristic overlap calculation
   */
  private tokenize(text: string): Set<string> {
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    // Ignore common stop words for basic heuristic
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'to', 'in', 'on', 'with', 'by', 'for', 'of', 'this', 'that', 'it']);
    return new Set(words.filter(w => !stopWords.has(w)));
  }

  /**
   * Calculates what portion of source tokens exist in target tokens
   */
  private calculateOverlapRatio(source: Set<string>, target: Set<string>): number {
    if (source.size === 0) return 0;
    
    let overlapCount = 0;
    for (const token of source) {
      if (target.has(token)) {
        overlapCount++;
      }
    }
    return overlapCount / source.size;
  }
}
