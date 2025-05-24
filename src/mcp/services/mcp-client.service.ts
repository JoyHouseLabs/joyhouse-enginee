import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { WebSocketClientTransport } from '@modelcontextprotocol/sdk/client/websocket.js';
import {
  McpServer,
  McpTransportType,
  McpServerStatus,
} from '../entities/mcp-server.entity';
import { spawn, ChildProcess } from 'child_process';

interface McpConnection {
  client: Client;
  transport: any;
  process?: ChildProcess;
  isConnected: boolean;
  lastError?: string;
}

@Injectable()
export class McpClientService implements OnModuleDestroy {
  private readonly logger = new Logger(McpClientService.name);
  private connections = new Map<string, McpConnection>();

  async onModuleDestroy() {
    // 清理所有连接
    for (const [serverId, connection] of this.connections) {
      await this.disconnect(serverId);
    }
  }

  async connect(server: McpServer): Promise<boolean> {
    try {
      this.logger.log(`Connecting to MCP server: ${server.name}`);

      // 如果已经连接，先断开
      if (this.connections.has(server.id)) {
        await this.disconnect(server.id);
      }

      let transport: any;
      let childProcess: ChildProcess | undefined;

      switch (server.transportType) {
        case McpTransportType.STDIO:
          const result = await this.createStdioTransport(server);
          transport = result.transport;
          childProcess = result.process;
          break;
        case McpTransportType.SSE:
          transport = await this.createSseTransport(server);
          break;
        case McpTransportType.WEBSOCKET:
          transport = await this.createWebSocketTransport(server);
          break;
        default:
          throw new Error(
            `Unsupported transport type: ${server.transportType}`,
          );
      }

      const client = new Client(
        {
          name: 'joyhouse-workflow-engine',
          version: '1.0.0',
        },
        {
          capabilities: {
            tools: {},
            resources: {},
            prompts: {},
          },
        },
      );

      await client.connect(transport);

      // 获取服务器信息
      const serverInfo = await client.getServerCapabilities();
      this.logger.log(`Connected to MCP server: ${JSON.stringify(serverInfo)}`);

      const connection: McpConnection = {
        client,
        transport,
        process: childProcess,
        isConnected: true,
      };

      this.connections.set(server.id, connection);
      return true;
    } catch (error: any) {
      this.logger.error(
        `Failed to connect to MCP server ${server.name}: ${error.message}`,
      );
      return false;
    }
  }

  async disconnect(serverId: string): Promise<void> {
    const connection = this.connections.get(serverId);
    if (!connection) return;

    try {
      if (connection.isConnected) {
        await connection.client.close();
      }

      if (connection.process) {
        connection.process.kill();
      }

      this.connections.delete(serverId);
      this.logger.log(`Disconnected from MCP server: ${serverId}`);
    } catch (error: any) {
      this.logger.error(
        `Error disconnecting from MCP server ${serverId}: ${error.message}`,
      );
    }
  }

  async listTools(serverId: string): Promise<any[]> {
    const connection = this.connections.get(serverId);
    if (!connection || !connection.isConnected) {
      throw new Error(`No active connection to server: ${serverId}`);
    }

    try {
      const result = await connection.client.listTools();
      return result.tools || [];
    } catch (error: any) {
      this.logger.error(
        `Failed to list tools from server ${serverId}: ${error.message}`,
      );
      throw error;
    }
  }

  async callTool(
    serverId: string,
    toolName: string,
    arguments_: Record<string, any>,
  ): Promise<any> {
    const connection = this.connections.get(serverId);
    if (!connection || !connection.isConnected) {
      throw new Error(`No active connection to server: ${serverId}`);
    }

    try {
      this.logger.log(
        `Calling tool ${toolName} on server ${serverId} with args:`,
        arguments_,
      );

      const result = await connection.client.callTool({
        name: toolName,
        arguments: arguments_,
      });

      this.logger.log(`Tool ${toolName} result:`, result);
      return result;
    } catch (error: any) {
      this.logger.error(
        `Failed to call tool ${toolName} on server ${serverId}: ${error.message}`,
      );
      throw error;
    }
  }

  async getServerCapabilities(serverId: string): Promise<any> {
    const connection = this.connections.get(serverId);
    if (!connection || !connection.isConnected) {
      throw new Error(`No active connection to server: ${serverId}`);
    }

    try {
      return await connection.client.getServerCapabilities();
    } catch (error: any) {
      this.logger.error(
        `Failed to get capabilities from server ${serverId}: ${error.message}`,
      );
      throw error;
    }
  }

  isConnected(serverId: string): boolean {
    const connection = this.connections.get(serverId);
    return connection?.isConnected || false;
  }

  getConnectionStatus(serverId: string): McpServerStatus {
    const connection = this.connections.get(serverId);
    if (!connection) return McpServerStatus.INACTIVE;
    return connection.isConnected
      ? McpServerStatus.ACTIVE
      : McpServerStatus.ERROR;
  }

  private async createStdioTransport(
    server: McpServer,
  ): Promise<{ transport: any; process: ChildProcess }> {
    const { command, args = [], env = {} } = server.config;

    if (!command) {
      throw new Error('STDIO transport requires command configuration');
    }

    const childProcess = spawn(command, args, {
      env: { ...process.env, ...env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const transport = new StdioClientTransport({
      stdin: childProcess.stdin,
      stdout: childProcess.stdout,
    } as any);

    return { transport, process: childProcess };
  }

  private async createSseTransport(server: McpServer): Promise<any> {
    const { url, headers = {} } = server.config;

    if (!url) {
      throw new Error('SSE transport requires URL configuration');
    }

    return new SSEClientTransport(new URL(url), {
      headers,
    } as any);
  }

  private async createWebSocketTransport(server: McpServer): Promise<any> {
    const { wsUrl } = server.config;

    if (!wsUrl) {
      throw new Error('WebSocket transport requires wsUrl configuration');
    }

    return new WebSocketClientTransport(new URL(wsUrl));
  }
}
