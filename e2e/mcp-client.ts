import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { ChildProcess } from "child_process";
import { logger } from "../src/logger.js";

export async function checkOllamaHealth(
  baseUrl: string = "http://localhost:11434",
): Promise<void> {
  try {
    const response = await fetch(`${baseUrl}/api/tags`);
    if (!response.ok) {
      throw new Error(`Ollama server responded with status ${response.status}`);
    }
    logger.info("Ollama server is running and accessible");
  } catch (error) {
    const message = `Ollama server is not running at ${baseUrl}. Please start Ollama server before running tests.`;
    logger.error(message);
    throw new Error(message);
  }
}

export interface MCPTestClient {
  client: Client;
  serverProcess: ChildProcess | undefined;
  cleanup: () => Promise<void>;
}

export async function createMCPTestClient(): Promise<MCPTestClient> {
  // Check if Ollama is running before starting tests
  await checkOllamaHealth();

  // Create transport and client
  const transport = new StdioClientTransport({
    command: "bun",
    args: [
      "index.ts",
      "--db-path=:memory:",
      "--ai-base-url=http://localhost:11434/v1",
      "--embeddings-model=mxbai-embed-large",
    ],
  });

  // We'll get the server process from the transport
  const serverProcess = (transport as any).process;

  const client = new Client(
    {
      name: "test-client",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  // Connect to the server
  await client.connect(transport);

  const cleanup = async () => {
    try {
      await client.close();
      if (serverProcess) {
        serverProcess.kill();

        // Wait for process to exit
        await new Promise<void>((resolve) => {
          serverProcess.on("exit", () => resolve());
          setTimeout(() => {
            serverProcess.kill("SIGKILL");
            resolve();
          }, 5000);
        });
      }
    } catch (error) {
      logger.error(`Error during cleanup: ${error}`);
    }
  };

  return {
    client,
    serverProcess,
    cleanup,
  };
}

export async function testToolCall(
  client: Client,
  toolName: string,
  args: Record<string, any>,
) {
  try {
    const result = await client.callTool({
      name: toolName,
      arguments: args,
    });
    return result;
  } catch (error) {
    logger.error(`Tool call failed: ${error}`);
    throw error;
  }
}

export async function testOllamaIntegration(
  client: Client,
  expectedToolCalls: string[],
) {
  // This would integrate with Ollama to test if the LLM correctly calls tools
  // For now, we'll simulate this by directly testing tool calls
  const results = [];

  for (const toolName of expectedToolCalls) {
    try {
      // Test basic tool availability
      const tools = await client.listTools();
      const tool = tools.tools?.find((t) => t.name === toolName);

      if (!tool) {
        throw new Error(`Tool ${toolName} not found`);
      }

      results.push({
        toolName,
        available: true,
        schema: tool.inputSchema,
      });
    } catch (error) {
      results.push({
        toolName,
        available: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
}
