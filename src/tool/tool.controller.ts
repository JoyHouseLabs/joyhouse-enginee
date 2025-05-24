import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Sse } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ToolService } from './tool.service';
import { CreateToolDto, UpdateToolDto } from './dto/tool.dto';
import { Tool, ToolType } from './entities/tool.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User as UserDecorator } from '../decorators/user.decorator';
import { User } from '../user/user.entity';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@ApiTags('tools')
@Controller('tools')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ToolController {
  constructor(private readonly toolService: ToolService) {}

  @Post()
  @ApiOperation({ summary: '创建工具' })
  @ApiResponse({ type: Tool })
  create(@Body() createToolDto: CreateToolDto, @UserDecorator() user: User) {
    return this.toolService.create(createToolDto, user);
  }

  @Get()
  @ApiOperation({ summary: '获取所有工具' })
  @ApiResponse({ type: [Tool] })
  findAll(@UserDecorator() user: User) {
    return this.toolService.findAll(user);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取指定工具' })
  @ApiResponse({ type: Tool })
  findOne(@Param('id') id: string, @UserDecorator() user: User) {
    return this.toolService.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新工具' })
  @ApiResponse({ type: Tool })
  update(
    @Param('id') id: string,
    @Body() updateToolDto: UpdateToolDto,
    @UserDecorator() user: User,
  ) {
    return this.toolService.update(id, updateToolDto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除工具' })
  @ApiResponse({ description: '删除成功' })
  remove(@Param('id') id: string, @UserDecorator() user: User) {
    return this.toolService.remove(id, user);
  }

  @Get('prompt/generate')
  @ApiOperation({ summary: '生成工具调用提示词' })
  @ApiResponse({ description: '生成的提示词' })
  generatePrompt(@UserDecorator() user: User) {
    return this.toolService.generateToolPrompt(user);
  }

  @Get('llm/format')
  @ApiOperation({ summary: '获取适用于大模型的工具格式' })
  @ApiResponse({ description: '格式化的工具列表' })
  getToolsForLLM(@UserDecorator() user: User) {
    return this.toolService.getToolsForLLM(user);
  }

  @Post(':id/execute')
  @ApiOperation({ summary: '执行工具' })
  @ApiResponse({ description: '执行结果' })
  execute(
    @Param('id') id: string,
    @Body() params: Record<string, any>,
    @UserDecorator() user: User,
  ) {
    return this.toolService.execute(id, params, user);
  }

  @Post(':id/stream')
  @ApiOperation({ summary: '流式执行工具' })
  @ApiResponse({ description: '流式执行结果' })
  @Sse()
  async stream(
    @Param('id') id: string,
    @Body() params: Record<string, any>,
    @UserDecorator() user: User,
  ): Promise<Observable<MessageEvent>> {
    const tool = await this.toolService.findOne(id, user);
    
    if (tool.type === ToolType.HTTP) {
      throw new Error('HTTP tools do not support streaming');
    }

    const stream = await this.toolService.execute(id, params, user);
    return stream.pipe(
      map(data => ({
        data: JSON.stringify(data),
        type: 'message',
        id: Date.now().toString(),
      })),
    );
  }
} 