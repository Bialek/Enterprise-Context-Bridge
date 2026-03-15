/* eslint-disable max-lines-per-function, @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { ToolRegistryService } from './tool-registry.service';
import { AgentTraceService } from './agent-trace/agent-trace.service';
import { EnterpriseContextService } from './enterprise-context/enterprise-context.service';
import { HybridSearchService } from './hybrid-search/hybrid-search.service';
import { RagEvalService } from './rag-eval/rag-eval.service';
import { AuditLogService } from '../observability/audit-log.service';
import { TOOL_DEFINITIONS } from './tool-definitions.config';

describe('ToolRegistryService', () => {
  let service: ToolRegistryService;
  let auditLogService: jest.Mocked<AuditLogService>;
  let hybridSearchService: jest.Mocked<HybridSearchService>;
  let ragEvalService: jest.Mocked<RagEvalService>;
  let enterpriseContextService: jest.Mocked<EnterpriseContextService>;
  let agentTraceService: jest.Mocked<AgentTraceService>;

  beforeEach(async () => {
    // Mock implementations
    auditLogService = {
      logToolCall: jest.fn(),
      logTrace: jest.fn(),
      onModuleInit: jest.fn(),
    } as unknown as jest.Mocked<AuditLogService>;

    hybridSearchService = {
      searchDocs: jest.fn(),
    } as unknown as jest.Mocked<HybridSearchService>;

    ragEvalService = {
      evaluate: jest.fn(),
    } as unknown as jest.Mocked<RagEvalService>;

    enterpriseContextService = {
      getContext: jest.fn(),
    } as unknown as jest.Mocked<EnterpriseContextService>;

    agentTraceService = {
      logTrace: jest.fn(),
    } as unknown as jest.Mocked<AgentTraceService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ToolRegistryService,
        { provide: AuditLogService, useValue: auditLogService },
        { provide: HybridSearchService, useValue: hybridSearchService },
        { provide: RagEvalService, useValue: ragEvalService },
        { provide: EnterpriseContextService, useValue: enterpriseContextService },
        { provide: AgentTraceService, useValue: agentTraceService },
      ],
    }).compile();

    service = module.get<ToolRegistryService>(ToolRegistryService);
  });

  describe('getToolDefinitions', () => {
    it('should return the static tool definitions array', () => {
      const defs = service.getToolDefinitions();
      expect(defs).toEqual(TOOL_DEFINITIONS);
      expect(defs).toHaveLength(4);
    });
  });

  describe('callTool', () => {
    it('should log audit record and mask sensitive keys for successful calls', async () => {
      enterpriseContextService.getContext.mockResolvedValue({ 
        jira_ticket: { id: 'TEST-1', 'api_key': 'super-secret' } 
      });

      const response = await service.callTool('get_enterprise_context', { ticket_id: 'TEST-1' });

      expect(enterpriseContextService.getContext).toHaveBeenCalledWith({ ticket_id: 'TEST-1' });
      // Verify sensitive data masking was applied to the generic result stream natively
      expect(response).toEqual({
        jira_ticket: { id: 'TEST-1', 'api_key': '***MASKED***' }
      });
      expect(auditLogService.logToolCall).toHaveBeenCalled();
    });

    it('should throw an error on unknown tool call and audit the failure', async () => {
      await expect(service.callTool('unknown_tool', {})).rejects.toThrow('Unknown tool: unknown_tool');
      
      expect(auditLogService.logToolCall).toHaveBeenCalledWith(
        'unknown_tool', 
        {}, 
        { error: 'Unknown tool: unknown_tool' }, 
        expect.any(Number)
      );
    });

    it('should validate inputs using zod schema and fail loudly', async () => {
      await expect(service.callTool('run_rag_evaluation', { question: 'Only question provided' })).rejects.toThrow();
    });

    it('should invoke hybridSearch correctly', async () => {
      hybridSearchService.searchDocs.mockResolvedValue([{ text: 'result 1', relevance_score: 1.0, source_url: 'http', metadata: {} }]);
      const res = await service.callTool('hybrid_search_docs', { query: 'test query', top_k: 2 });
      expect(hybridSearchService.searchDocs).toHaveBeenCalledWith({ query: 'test query', top_k: 2 });
      expect(res).toBeDefined();
    });
  });
});
