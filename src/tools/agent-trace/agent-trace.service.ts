import { Injectable } from '@nestjs/common';
import { AuditLogService } from '../../observability/audit-log.service';

export interface AgentTraceParams {
  step_name: string;
  input?: unknown;
  output?: unknown;
}

@Injectable()
export class AgentTraceService {
  constructor(private auditLogService: AuditLogService) {}

  /**
   * Logs an agent trace
   */
  logTrace(params: AgentTraceParams): Record<string, unknown> {
    const traceId = this.auditLogService.logTrace(params.step_name, params.input, params.output);
    return {
      success: true,
      trace_id: traceId,
      message: `Trace logged successfully for step '${params.step_name}'`,
    };
  }
}
