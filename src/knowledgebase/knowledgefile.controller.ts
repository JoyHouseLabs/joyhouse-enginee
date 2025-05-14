import { Controller, Get, Post, Body, Param, Req, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiResponse, ApiBody, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { KnowledgefileService } from './knowledgefile.service';
import { KnowledgefileDto } from './knowledgefile.dto';
import { KnowledgefileCreateDto } from './knowledgefile-create.dto';
import { KnowledgefileUpdateDto } from './knowledgefile-update.dto';
import { JwtAuthGuard } from '../user/jwt-auth.guard';

@ApiTags('知识文件')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('knowledgefile')
export class KnowledgefileController {
  constructor(private readonly kfService: KnowledgefileService) {}

  @Get('list')
  @ApiResponse({ status: 200, description: '分页获取知识库文件', type: [KnowledgefileDto] })
  async getAll(@Req() req, @Query() query: import('./knowledgefile-query.dto').KnowledgefileQueryDto) {
    const userId = req.user.sub;
    const { knowledgebaseId, page = 1, pageSize = 10 } = query;
    return this.kfService.findAll(knowledgebaseId ?? '', userId, page, pageSize);
  }

  @Get('file/:id')
  @ApiResponse({ status: 200, type: KnowledgefileDto, description: '获取单个知识文件' })
  async getOne(@Param('id') id: string, @Req() req) {
    const userId = req.user.sub;
    return this.kfService.findById(id, userId);
  }

  @Post('create')
  @ApiBody({ type: KnowledgefileCreateDto, description: '新建知识文件' })
  @ApiResponse({ status: 201, type: KnowledgefileDto, description: '创建新知识文件' })
  async create(@Body() body: import('./knowledgefile-create.dto').KnowledgefileCreateDto, @Req() req) {
    const userId = req.user.sub;
    return this.kfService.create(body, userId, body.knowledgebaseId);
  }

  @Post('update')
  @ApiBody({ type: KnowledgefileUpdateDto, description: '更新知识文件' })
  @ApiResponse({ status: 200, type: KnowledgefileDto, description: '更新知识文件' })
  async update(@Body() body: import('./knowledgefile-update.dto').KnowledgefileUpdateDto, @Req() req) {
    const userId = req.user.sub;
    return this.kfService.update(body.id, userId, body);
  }

  @Post('batch-delete')
  @ApiBody({ schema: { type: 'object', properties: { ids: { type: 'array', items: { type: 'string' } } } }, description: '批量删除知识文件' })
  @ApiResponse({ status: 200, description: '批量删除结果' })
  async batchDelete(@Body('ids') ids: string[], @Req() req) {
    const userId = req.user.sub;
    return Promise.all(ids.map(id => this.kfService.remove(id, userId)));
  }

  @Post('delete/:id')
  @ApiParam({ name: 'id', description: '知识文件ID' })
  @ApiResponse({ status: 200, description: '删除知识文件' })
  async delete(@Param('id') id: string, @Req() req) {
    const userId = req.user.sub;
    return this.kfService.remove(id, userId);
  }
}
