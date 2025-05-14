import { Controller, Get, Post, Body, Param, Req, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { ReplyCreateDto, ReplyUpdateDto } from './reply.dto';
import { ReplyQueryDto } from './reply-query.dto';
import { ReplyListItemDto, ReplyListPageDto } from './reply-list.dto';
import { JwtAuthGuard } from '../user/jwt-auth.guard';
import { ReplyService } from './reply.service';

@ApiTags('回复')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reply')
export class ReplyController {
  constructor(private readonly replyService: ReplyService) {}

  @Get()
  @ApiResponse({ status: 200, description: '分页获取回复', schema: { example: { list: [{ content: 'xxx', target: 'note', targetId: '1' }], total: 11, total_page: 2, pagesize: 10 } } })
  async getReplies(@Req() req, @Query() query: ReplyQueryDto): Promise<ReplyListPageDto> {
    const userId = req.user.sub;
    const { page = 1, pageSize = 10, target, targetId } = query;
    const { data, total } = await this.replyService.findAll(userId, Number(page), Number(pageSize), target, targetId);
    return {
      list: data.map(({ id, userId, target, targetId, content, mentionUserId, createdAt, updatedAt }) => ({ id, userId, target, targetId, content, mentionUserId, createdAt, updatedAt })),
      total,
      total_page: Math.ceil(total / Number(pageSize)),
      pagesize: Number(pageSize),
    };
  }

  @Get(':id')
  @ApiResponse({ status: 200, type: ReplyListItemDto, description: '获取单条回复' })
  async getReply(@Param('id') id, @Req() req): Promise<ReplyListItemDto | null> {
    const userId = req.user.sub;
    return this.replyService.findById(id, userId);
  }

  @Post('create-reply')
  @ApiBody({ type: ReplyCreateDto, description: '新建回复内容' })
  @ApiResponse({ status: 201, type: ReplyListItemDto, description: '创建新回复' })
  async createReply(@Body() body: ReplyCreateDto, @Req() req): Promise<ReplyListItemDto> {
    const userId = req.user.sub;
    return this.replyService.create(body, userId);
  }

  @Post('update')
  @ApiBody({ type: ReplyUpdateDto, description: '要更新的回复内容（需包含id，可部分字段）' })
  @ApiResponse({ status: 200, type: ReplyListItemDto, description: '更新回复' })
  async updateReply(@Req() req, @Body() dto: ReplyUpdateDto): Promise<ReplyListItemDto | null> {
    const { id, ...rest } = dto;
    const userId = req.user.sub;
    return this.replyService.update(id, userId, rest);
  }

  @Post(':id/delete')
  @ApiResponse({ status: 200, description: '删除回复，返回是否成功' })
  async removeReply(@Param('id') id, @Req() req): Promise<{ success: boolean }> {
    const userId = req.user.sub;
    const success = await this.replyService.remove(id, userId);
    return { success };
  }
}
