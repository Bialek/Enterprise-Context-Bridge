import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { AgentTraceService } from './agent-trace/agent-trace.service';
import { EnterpriseContextService } from './enterprise-context/enterprise-context.service';
import { HybridSearchService } from './hybrid-search/hybrid-search.service';
import { RagEvalService } from './rag-eval/rag-eval.service';
import { AuditLogService } from '../observability/audit-log.service';
import { maskSensitiveData } from '../common/data-masking.util';

@Injectable()
export class ToolRegistryService {
  constructor(
    private hybridSearchService: HybridSearchService,
    private ragEvalService: RagEvalService,
    private enterpriseContextService: EnterpriseContextService,
    private agentTraceService: AgentTraceService,
    private auditLogService: AuditLogService,
  ) {}

  /**
   * Returns MCP tool definitions
   */
  async getToolDefinitions() {
    return [
      {
        name: 'hybrid_search_docs',
        description: 'Performs a search across Enterprise documentation. Can handle semantic queries about SAP, Jira, and internal architecture.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'The search query or question' },
            top_k: { type: 'number', description: 'Number of results to return (default 5)' },
          },
          required: ['query'],
        },
      },
      {
        name: 'run_rag_evaluation',
        description: 'Evaluates an LLM answer against retrieved context. Returns Faithfulness, Relevancy, and Hallucination Risk metrics.',
        inputSchema: {
          type: 'object',
          properties: {
            question: { type: 'string', description: 'Original user question' },
            answer: { type: 'string', description: 'Generated answer to evaluate' },
            context: { type: 'string', description: 'Source context used to generate the answer' },
          },
          required: ['question', 'answer', 'context'],
        },
      },
      {
        name: 'get_enterprise_context',
        description: 'Retrieves data from mocked enterprise systems (Jira, SAP BTP, SAP HANA). Extracts statuses or ticket details.',
        inputSchema: {
          type: 'object',
          properties: {
            ticket_id: { type: 'string', description: 'e.g. ECB-101' },
            system_module: { type: 'string', description: 'e.g. btp or hana' },
          },
        },
      },
      {
        name: 'log_agent_trace',
        description: 'Logs agent thought process and step outcomes for observability systems.',
        inputSchema: {
          type: 'object',
          properties: {
            step_name: { type: 'string', description: 'Name of the reasoning or action step' },
            input: { type: 'object', description: 'Inputs to the step' },
            output: { type: 'object', description: 'Outputs or conclusions of the step' },
          },
          required: ['step_name', 'input', 'output'],
        },
      },
    ];
  }

  /**
   * Router for tool execution with validation, execution, masking, and auditing
   */
  async callTool(name: string, args: any): Promise<any> {
    const startTime = Date.now();
    let result: any;

    try {
      switch (name) {
        case 'hybrid_search_docs': {
          const schema = z.object({ query: z.string(), top_k: z.number().optional() });
          const parsed = schema.parse(args);
          result = await this.hybridSearchService.searchDocs(parsed);
          break;
        }

        case 'run_rag_evaluation': {
          const schema = z.object({ question: z.string(), answer: z.string(), context: z.string() });
          const parsed = schema.parse(args);
          result = await this.ragEvalService.evaluate(parsed);
          break;
        }

        case 'get_enterprise_context': {
          const schema = z.object({ ticket_id: z.string().optional(), system_module: z.string().optional() });
          const parsed = schema.parse(args);
          if (!parsed.ticket_id && !parsed.system_module) {
            throw new Error('Must provide either ticket_id or system_module');
          }
          result = await this.enterpriseContextService.getContext(parsed);
          break;
        }

        case 'log_agent_trace': {
          const schema = z.object({ step_name: z.string(), input: z.any(), output: z.any() });
          const parsed = schema.parse(args);
          result = await this.agentTraceService.logTrace(parsed);
          break;
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }

      // Automatically mask sensitive data globally on all external outputs
      const maskedResult = maskSensitiveData(result);
      
      const duration = Date.now() - startTime;
      await this.auditLogService.logToolCall(name, args, maskedResult, duration);
      
      return maskedResult;

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.auditLogService.logToolCall(name, args, { error: errorMessage }, duration);
      throw error;
    }
  }
}
