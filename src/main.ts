import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { ToolRegistryService } from './tools/tool-registry.service';
import { Logger } from '@nestjs/common';

/**
 * The Enterprise Context Bridge (ECB) MCP Server
 * 
 * bootstraps a standalone NestJS application and wires it into the 
 * Model Context Protocol (MCP) using the stdio transport.
 */
// eslint-disable-next-line max-lines-per-function
async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');

  // Capture all stdout to stderr to prevent corruption of the MCP channel
  process.stdout.write = (chunk: Uint8Array | string, encoding?: BufferEncoding | ((err?: Error | null) => void), callback?: (err?: Error | null) => void): boolean => {
    // Overload resolution needs to be simplified due to variadic nature of write
    return process.stderr.write(chunk, encoding as BufferEncoding, callback as (err?: Error | null) => void);
  };

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const toolRegistry = app.get(ToolRegistryService);

  // eslint-disable-next-line @typescript-eslint/no-deprecated
  const server = new Server(
    {
      name: 'enterprise-context-bridge',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  /**
   * List available tools
   */
  server.setRequestHandler(ListToolsRequestSchema, () => {
    const tools = toolRegistry.getToolDefinitions();
    return { tools };
  });

  /**
   * Handle tool calls
   */
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
      const result = await toolRegistry.callTool(name, args ?? {});
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: `Error executing tool '${name}': ${message}`,
          },
        ],
        isError: true,
      };
    }
  });

  // Start the server on stdio
  const transport = new StdioServerTransport();
  
  // Restore stdout for the transport ONLY
  // The transport implementation uses process.stdout internally.
  // We need to make sure the transport can write its JSON-RPC responses to stdout.
  // By using StdioServerTransport, it will use process.stdin/stdout.
  
  await server.connect(transport);
  
  logger.warn('Enterprise Context Bridge MCP server running on stdio');

  // Handle shutdown
  process.on('SIGINT', () => {
    app.close().then(() => process.exit(0)).catch(() => process.exit(1));
  });
}

bootstrap().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error('Fatal error during bootstrap:', error);
  process.exit(1);
});
