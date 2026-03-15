import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema, 
  InitializeRequestSchema 
} from '@modelcontextprotocol/sdk/types.js';
import { ToolRegistryService } from './tools/tool-registry.service';

/**
 * The Enterprise Context Bridge (ECB) MCP Server
 * 
 * bootstraps a standalone NestJS application and wires it into the 
 * Model Context Protocol (MCP) using the stdio transport.
 */
async function bootstrap() {
  // Capture all stdout to stderr to prevent corruption of the MCP channel
  const originalStdoutWrite = process.stdout.write.bind(process.stdout);
  process.stdout.write = (chunk: any, encoding?: any, callback?: any) => {
    return process.stderr.write(chunk, encoding, callback);
  };

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const toolRegistry = app.get(ToolRegistryService);

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
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools = await toolRegistry.getToolDefinitions();
    return { tools };
  });

  /**
   * Handle tool calls
   */
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
      const result = await toolRegistry.callTool(name, args);
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
  
  console.error('Enterprise Context Bridge MCP server running on stdio');

  // Handle shutdown
  process.on('SIGINT', async () => {
    await app.close();
    process.exit(0);
  });
}

bootstrap().catch((error) => {
  console.error('Fatal error during bootstrap:', error);
  process.exit(1);
});
