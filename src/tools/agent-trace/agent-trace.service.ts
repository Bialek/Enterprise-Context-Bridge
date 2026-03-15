import { Injectable } from '@nestjs/common';
import { AuditLogService } from '../../observability/audit-log.service';

export interface AgentTraceParams {
  step_name: string;
  input?: any;
  output?: any;
}

@Injectable()
export class AgentTraceService {
  constructor(private auditLogService: AuditLogService) {}

  /**
   * Logs an agent trace
   */
  async logTrace(params: AgentTraceParams) {
    const traceId = await this.auditLogService.logTrace(params.step_name, params.input, params.output);
    return {
      success: true,
      trace_id: traceId,
      message: `Trace logged successfully for step '${params.step_name}'`,
    };
  }
}
