import { Tool } from '@modelcontextprotocol/sdk/types.js';

/**
 * Static tool definitions for the Enterprise Context Bridge MCP.
 * Extracted from ToolRegistryService to adhere to the Single Responsibility Principle
 * and reduce class complexity.
 */
export const TOOL_DEFINITIONS: Tool[] = [
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
