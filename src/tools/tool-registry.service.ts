import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { AgentTraceService } from './agent-trace/agent-trace.service';
import { EnterpriseContextService } from './enterprise-context/enterprise-context.service';
import { HybridSearchService } from './hybrid-search/hybrid-search.service';
import { RagEvalService } from './rag-eval/rag-eval.service';
import { AuditLogService } from '../observability/audit-log.service';
import { maskSensitiveData } from '../common/data-masking.util';
import { TOOL_DEFINITIONS } from './tool-definitions.config';
import { Tool } from '@modelcontextprotocol/sdk/types.js';

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
  getToolDefinitions(): Tool[] {
    return TOOL_DEFINITIONS;
  }

  /**
   * Router for tool execution with validation, execution, masking, and auditing
   */
  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    const startTime = Date.now();
    let result: unknown;

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
          result = this.ragEvalService.evaluate(parsed);
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
          const schema = z.object({ step_name: z.string(), input: z.unknown(), output: z.unknown() });
          const parsed = schema.parse(args);
          // type cast to match what agent trace expects or refactor agent trace as well
          result = this.agentTraceService.logTrace(parsed);
          break;
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }

      // Automatically mask sensitive data globally on all external outputs
      const maskedResult = maskSensitiveData(result);
      
      const duration = Date.now() - startTime;
      this.auditLogService.logToolCall(name, args, maskedResult, duration);
      
      return maskedResult;

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.auditLogService.logToolCall(name, args, { error: errorMessage }, duration);
      throw error;
    }
  }
}
