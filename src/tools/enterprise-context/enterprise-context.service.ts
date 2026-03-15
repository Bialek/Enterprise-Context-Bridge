import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface EnterpriseContextParams {
  ticket_id?: string;
  system_module?: string;
}

@Injectable()
export class EnterpriseContextService {
  private mockData: any;

  constructor() {
    this.loadMockData();
  }

  private loadMockData() {
    try {
      const dataPath = path.join(process.cwd(), 'data', 'mock-enterprise.json');
      const raw = fs.readFileSync(dataPath, 'utf-8');
      this.mockData = JSON.parse(raw);
    } catch (e) {
      console.error('Failed to load mock enterprise data:', e);
      this.mockData = { jira: [], sap: { btp: {}, hana: {} } };
    }
  }

  /**
   * Retrieves enterprise context (simulate Jira / SAP BTP / SAP HANA)
   */
  async getContext(params: EnterpriseContextParams) {
    const result: any = {};

    if (params.ticket_id) {
      const ticket = this.mockData.jira.find((t: any) => t.id === params.ticket_id);
      if (ticket) {
        result.jira_ticket = ticket;
      } else {
        result.jira_ticket = { error: `Ticket ${params.ticket_id} not found.` };
      }
    }

    if (params.system_module) {
      const module = params.system_module.toLowerCase();
      if (module === 'btp') {
        result.sap_btp = this.mockData.sap.btp;
      } else if (module === 'hana') {
        result.sap_hana = this.mockData.sap.hana;
      } else {
        result.system_module = { error: `Module ${params.system_module} not recognized. Try 'btp' or 'hana'.` };
      }
    }

    return result;
  }
}
