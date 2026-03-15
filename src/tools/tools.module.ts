import { Module } from '@nestjs/common';
import { AgentTraceService } from './agent-trace/agent-trace.service';
import { EnterpriseContextService } from './enterprise-context/enterprise-context.service';
import { HybridSearchService } from './hybrid-search/hybrid-search.service';
import { RagEvalService } from './rag-eval/rag-eval.service';
import { ToolRegistryService } from './tool-registry.service';

@Module({
  providers: [
    AgentTraceService,
    EnterpriseContextService,
    HybridSearchService,
    RagEvalService,
    ToolRegistryService,
  ],
  exports: [ToolRegistryService],
})
export class ToolsModule {}
