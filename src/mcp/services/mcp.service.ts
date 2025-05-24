import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { McpServer, McpServerStatus } from '../entities/mcp-server.entity';
import { McpTool } from '../entities/mcp-tool.entity';
import {
  CreateMcpServerDto,
  UpdateMcpServerDto,
  ExecuteMcpToolDto,
} from '../dto/mcp.dto';
import { User } from '../../user/user.entity';
import { McpClientService } from './mcp-client.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class McpService {
  private readonly logger = new Logger(McpService.name);

  constructor(
    @InjectRepository(McpServer)
    private readonly mcpServerRepository: Repository<McpServer>,
    @InjectRepository(McpTool)
    private readonly mcpToolRepository: Repository<McpTool>,
    private readonly mcpClientService: McpClientService,
  ) {}

  // MCP服务器管理
  async createServer(
    createDto: CreateMcpServerDto,
    user: User,
  ): Promise<McpServer> {
    const server = this.mcpServerRepository.create({
      ...createDto,
      user,
      status: McpServerStatus.INACTIVE,
    });

    const savedServer = await this.mcpServerRepository.save(server);

    // 尝试连接到服务器
    if (createDto.transportType) {
      await this.connectServer(savedServer.id, user);
    }

    return savedServer;
  }

  async findAllServers(user: User): Promise<McpServer[]> {
    return this.mcpServerRepository.find({
      where: [{ user: { id: user.id } }, { isPublic: true }],
      relations: ['tools'],
    });
  }

  async findServerById(id: string, user: User): Promise<McpServer> {
    const server = await this.mcpServerRepository.findOne({
      where: [
        { id, user: { id: user.id } },
        { id, isPublic: true },
      ],
      relations: ['tools'],
    });

    if (!server) {
      throw new NotFoundException(`MCP server with ID ${id} not found`);
    }

    return server;
  }

  async updateServer(
    id: string,
    updateDto: UpdateMcpServerDto,
    user: User,
  ): Promise<McpServer> {
    const server = await this.findServerById(id, user);
    Object.assign(server, updateDto);

    const updatedServer = await this.mcpServerRepository.save(server);

    // 如果服务器配置发生变化，重新连接
    if (updateDto.config || updateDto.transportType) {
      await this.reconnectServer(id, user);
    }

    return updatedServer;
  }

  async removeServer(id: string, user: User): Promise<void> {
    const server = await this.findServerById(id, user);

    // 断开连接
    await this.mcpClientService.disconnect(id);

    // 删除相关工具
    await this.mcpToolRepository.delete({ server: { id } });

    // 删除服务器
    await this.mcpServerRepository.remove(server);
  }

  // 连接管理
  async connectServer(serverId: string, user: User): Promise<boolean> {
    const server = await this.findServerById(serverId, user);

    try {
      server.status = McpServerStatus.CONNECTING;
      await this.mcpServerRepository.save(server);

      const connected = await this.mcpClientService.connect(server);

      if (connected) {
        server.status = McpServerStatus.ACTIVE;
        server.lastConnectedAt = new Date();
        server.lastError = undefined;

        // 获取服务器信息和能力
        try {
          const capabilities =
            await this.mcpClientService.getServerCapabilities(serverId);
          server.capabilities = capabilities.capabilities;
          server.serverInfo = capabilities.serverInfo;
        } catch (error: any) {
          this.logger.warn(
            `Failed to get server capabilities: ${error.message}`,
          );
        }

        // 同步工具列表
        await this.syncServerTools(server);
      } else {
        server.status = McpServerStatus.ERROR;
        server.lastError = 'Failed to connect';
      }

      await this.mcpServerRepository.save(server);
      return connected;
    } catch (error: any) {
      server.status = McpServerStatus.ERROR;
      server.lastError = error.message;
      await this.mcpServerRepository.save(server);
      throw error;
    }
  }

  async disconnectServer(serverId: string, user: User): Promise<void> {
    const server = await this.findServerById(serverId, user);

    await this.mcpClientService.disconnect(serverId);

    server.status = McpServerStatus.INACTIVE;
    await this.mcpServerRepository.save(server);
  }

  async reconnectServer(serverId: string, user: User): Promise<boolean> {
    await this.disconnectServer(serverId, user);
    return this.connectServer(serverId, user);
  }

  // 工具管理
  async syncServerTools(server: McpServer): Promise<void> {
    try {
      const tools = await this.mcpClientService.listTools(server.id);

      // 删除现有工具
      await this.mcpToolRepository.delete({ server: { id: server.id } });

      // 创建新工具
      for (const toolInfo of tools) {
        const tool = this.mcpToolRepository.create({
          name: toolInfo.name,
          description: toolInfo.description,
          inputSchema: toolInfo.inputSchema,
          outputSchema: toolInfo.outputSchema,
          server,
          user: server.user,
          isAvailable: true,
        });

        await this.mcpToolRepository.save(tool);
      }

      this.logger.log(`Synced ${tools.length} tools for server ${server.name}`);
    } catch (error: any) {
      this.logger.error(
        `Failed to sync tools for server ${server.name}: ${error.message}`,
      );
    }
  }

  async findAllTools(user: User, serverId?: string): Promise<McpTool[]> {
    const whereCondition: any = [
      { user: { id: user.id } },
      { server: { isPublic: true } },
    ];

    if (serverId) {
      whereCondition.forEach((condition: any) => {
        condition.server = { ...condition.server, id: serverId };
      });
    }

    return this.mcpToolRepository.find({
      where: whereCondition,
      relations: ['server'],
    });
  }

  async findToolById(id: string, user: User): Promise<McpTool> {
    const tool = await this.mcpToolRepository.findOne({
      where: [
        { id, user: { id: user.id } },
        { id, server: { isPublic: true } },
      ],
      relations: ['server'],
    });

    if (!tool) {
      throw new NotFoundException(`MCP tool with ID ${id} not found`);
    }

    return tool;
  }

  async findToolByName(
    serverName: string,
    toolName: string,
    user: User,
  ): Promise<McpTool> {
    const tool = await this.mcpToolRepository.findOne({
      where: [
        { name: toolName, server: { name: serverName }, user: { id: user.id } },
        { name: toolName, server: { name: serverName, isPublic: true } },
      ],
      relations: ['server'],
    });

    if (!tool) {
      throw new NotFoundException(
        `MCP tool ${toolName} not found on server ${serverName}`,
      );
    }

    return tool;
  }

  // 工具执行
  async executeTool(
    serverId: string,
    executeDto: ExecuteMcpToolDto,
    user: User,
  ): Promise<any> {
    const server = await this.findServerById(serverId, user);

    if (!this.mcpClientService.isConnected(serverId)) {
      throw new Error(`Server ${server.name} is not connected`);
    }

    const tool = await this.mcpToolRepository.findOne({
      where: { name: executeDto.toolName, server: { id: serverId } },
    });

    if (tool) {
      tool.usageCount += 1;
      tool.lastUsedAt = new Date();
      await this.mcpToolRepository.save(tool);
    }

    return this.mcpClientService.callTool(
      serverId,
      executeDto.toolName,
      executeDto.arguments || {},
    );
  }

  async executeToolByName(
    serverName: string,
    toolName: string,
    arguments_: Record<string, any>,
    user: User,
  ): Promise<any> {
    const tool = await this.findToolByName(serverName, toolName, user);

    if (!this.mcpClientService.isConnected(tool.server.id)) {
      // 尝试自动连接
      const connected = await this.connectServer(tool.server.id, user);
      if (!connected) {
        throw new Error(`Server ${serverName} is not available`);
      }
    }

    tool.usageCount += 1;
    tool.lastUsedAt = new Date();
    await this.mcpToolRepository.save(tool);

    return this.mcpClientService.callTool(tool.server.id, toolName, arguments_);
  }

  // 健康检查和自动重连
  @Cron(CronExpression.EVERY_5_MINUTES)
  async healthCheck(): Promise<void> {
    const activeServers = await this.mcpServerRepository.find({
      where: { status: McpServerStatus.ACTIVE, autoReconnect: true },
    });

    for (const server of activeServers) {
      try {
        if (!this.mcpClientService.isConnected(server.id)) {
          this.logger.log(`Attempting to reconnect to server: ${server.name}`);
          await this.mcpClientService.connect(server);
        }
      } catch (error: any) {
        this.logger.error(
          `Health check failed for server ${server.name}: ${error.message}`,
        );
        server.status = McpServerStatus.ERROR;
        server.lastError = error.message;
        await this.mcpServerRepository.save(server);
      }
    }
  }

  // 获取服务器状态
  async getServerStatus(
    serverId: string,
    user: User,
  ): Promise<{
    server: McpServer;
    isConnected: boolean;
    toolCount: number;
  }> {
    const server = await this.findServerById(serverId, user);
    const isConnected = this.mcpClientService.isConnected(serverId);
    const toolCount = await this.mcpToolRepository.count({
      where: { server: { id: serverId } },
    });

    return {
      server,
      isConnected,
      toolCount,
    };
  }
}
