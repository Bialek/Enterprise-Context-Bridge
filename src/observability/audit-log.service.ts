import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AuditLogService implements OnModuleInit {
  private logDir: string;
  private auditFile: string;

  constructor(private configService: ConfigService) {
    this.logDir = this.configService.get<string>('LOG_DIR') || './logs';
    this.auditFile = path.join(this.logDir, 'audit.jsonl');
  }

  onModuleInit() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  /**
   * Logs a tool call to the audit file
   */
  async logToolCall(toolName: string, input: any, output: any, duration: number) {
    const entry = {
      timestamp: new Date().toISOString(),
      tool: toolName,
      input,
      output,
      duration_ms: duration,
    };

    const line = JSON.stringify(entry) + '\n';
    fs.appendFileSync(this.auditFile, line);
  }

  /**
   * Logs an agent trace
   */
  async logTrace(stepName: string, input: any, output: any) {
    const traceFile = path.join(this.logDir, 'agent-traces.jsonl');
    const entry = {
      timestamp: new Date().toISOString(),
      step_name: stepName,
      input,
      output,
      trace_id: Math.random().toString(36).substring(2, 15),
    };

    const line = JSON.stringify(entry) + '\n';
    fs.appendFileSync(traceFile, line);
    return entry.trace_id;
  }
}
