import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { McpService } from './services/mcp.service';
import {
  CreateMcpServerDto,
  UpdateMcpServerDto,
  ExecuteMcpToolDto,
  McpServerConnectionDto,
  McpToolListDto,
} from './dto/mcp.dto';

@ApiTags('MCP')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('mcp')
export class McpController {
  constructor(private readonly mcpService: McpService) {}

  // MCP服务器管理
  @Post('servers')
  @ApiOperation({ summary: '创建MCP服务器' })
  @ApiResponse({ status: 201, description: 'MCP服务器创建成功' })
  async createServer(
    @Body() createDto: CreateMcpServerDto,
    @Request() req: any,
  ) {
    return this.mcpService.createServer(createDto, req.user);
  }

  @Get('servers')
  @ApiOperation({ summary: '获取所有MCP服务器' })
  @ApiResponse({ status: 200, description: '获取MCP服务器列表成功' })
  async findAllServers(@Request() req: any) {
    return this.mcpService.findAllServers(req.user);
  }

  @Get('servers/:id')
  @ApiOperation({ summary: '获取指定MCP服务器' })
  @ApiResponse({ status: 200, description: '获取MCP服务器成功' })
  async findServerById(@Param('id') id: string, @Request() req: any) {
    return this.mcpService.findServerById(id, req.user);
  }

  @Patch('servers/:id')
  @ApiOperation({ summary: '更新MCP服务器' })
  @ApiResponse({ status: 200, description: 'MCP服务器更新成功' })
  async updateServer(
    @Param('id') id: string,
    @Body() updateDto: UpdateMcpServerDto,
    @Request() req: any,
  ) {
    return this.mcpService.updateServer(id, updateDto, req.user);
  }

  @Delete('servers/:id')
  @ApiOperation({ summary: '删除MCP服务器' })
  @ApiResponse({ status: 200, description: 'MCP服务器删除成功' })
  async removeServer(@Param('id') id: string, @Request() req: any) {
    await this.mcpService.removeServer(id, req.user);
    return { message: 'MCP服务器删除成功' };
  }

  // 连接管理
  @Post('servers/:id/connect')
  @ApiOperation({ summary: '连接到MCP服务器' })
  @ApiResponse({ status: 200, description: '连接成功' })
  async connectServer(@Param('id') id: string, @Request() req: any) {
    const connected = await this.mcpService.connectServer(id, req.user);
    return { connected, message: connected ? '连接成功' : '连接失败' };
  }

  @Post('servers/:id/disconnect')
  @ApiOperation({ summary: '断开MCP服务器连接' })
  @ApiResponse({ status: 200, description: '断开连接成功' })
  async disconnectServer(@Param('id') id: string, @Request() req: any) {
    await this.mcpService.disconnectServer(id, req.user);
    return { message: '断开连接成功' };
  }

  @Post('servers/:id/reconnect')
  @ApiOperation({ summary: '重新连接MCP服务器' })
  @ApiResponse({ status: 200, description: '重新连接成功' })
  async reconnectServer(@Param('id') id: string, @Request() req: any) {
    const connected = await this.mcpService.reconnectServer(id, req.user);
    return { connected, message: connected ? '重新连接成功' : '重新连接失败' };
  }

  @Get('servers/:id/status')
  @ApiOperation({ summary: '获取MCP服务器状态' })
  @ApiResponse({ status: 200, description: '获取状态成功' })
  async getServerStatus(@Param('id') id: string, @Request() req: any) {
    return this.mcpService.getServerStatus(id, req.user);
  }

  @Post('servers/:id/sync-tools')
  @ApiOperation({ summary: '同步MCP服务器工具' })
  @ApiResponse({ status: 200, description: '同步工具成功' })
  async syncServerTools(@Param('id') id: string, @Request() req: any) {
    const server = await this.mcpService.findServerById(id, req.user);
    await this.mcpService.syncServerTools(server);
    return { message: '工具同步成功' };
  }

  // 工具管理
  @Get('tools')
  @ApiOperation({ summary: '获取所有MCP工具' })
  @ApiResponse({ status: 200, description: '获取工具列表成功' })
  async findAllTools(@Query() query: McpToolListDto, @Request() req: any) {
    return this.mcpService.findAllTools(req.user, query.serverId);
  }

  @Get('tools/:id')
  @ApiOperation({ summary: '获取指定MCP工具' })
  @ApiResponse({ status: 200, description: '获取工具成功' })
  async findToolById(@Param('id') id: string, @Request() req: any) {
    return this.mcpService.findToolById(id, req.user);
  }

  @Get('servers/:serverName/tools/:toolName')
  @ApiOperation({ summary: '根据服务器名称和工具名称获取工具' })
  @ApiResponse({ status: 200, description: '获取工具成功' })
  async findToolByName(
    @Param('serverName') serverName: string,
    @Param('toolName') toolName: string,
    @Request() req: any,
  ) {
    return this.mcpService.findToolByName(serverName, toolName, req.user);
  }

  // 工具执行
  @Post('servers/:id/execute')
  @ApiOperation({ summary: '执行MCP工具' })
  @ApiResponse({ status: 200, description: '工具执行成功' })
  async executeTool(
    @Param('id') serverId: string,
    @Body() executeDto: ExecuteMcpToolDto,
    @Request() req: any,
  ) {
    return this.mcpService.executeTool(serverId, executeDto, req.user);
  }

  @Post('servers/:serverName/tools/:toolName/execute')
  @ApiOperation({ summary: '根据名称执行MCP工具' })
  @ApiResponse({ status: 200, description: '工具执行成功' })
  async executeToolByName(
    @Param('serverName') serverName: string,
    @Param('toolName') toolName: string,
    @Body() body: { arguments?: Record<string, any> },
    @Request() req: any,
  ) {
    return this.mcpService.executeToolByName(
      serverName,
      toolName,
      body.arguments || {},
      req.user,
    );
  }

  // 工具信息获取（用于工作流引擎）
  @Get('tools-for-workflow')
  @ApiOperation({ summary: '获取用于工作流的MCP工具列表' })
  @ApiResponse({ status: 200, description: '获取工具列表成功' })
  async getToolsForWorkflow(@Request() req: any) {
    const tools = await this.mcpService.findAllTools(req.user);

    return tools.map((tool) => ({
      id: tool.id,
      name: tool.name,
      description: tool.description,
      serverName: tool.server.name,
      serverId: tool.server.id,
      inputSchema: tool.inputSchema,
      outputSchema: tool.outputSchema,
      category: 'mcp',
      type: 'mcp_tool',
      isAvailable: tool.isAvailable && tool.server.status === 'active',
      metadata: {
        ...tool.metadata,
        serverTransportType: tool.server.transportType,
        usageCount: tool.usageCount,
        lastUsedAt: tool.lastUsedAt,
      },
    }));
  }
}
