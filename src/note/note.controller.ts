import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { NoteService } from './note.service';
import { NoteDto } from './note.dto';
import { NoteCreateDto } from './note-create.dto';
import { NoteUpdateDto } from './note-update.dto';
import { NoteQueryDto } from './note-query.dto';
import { NoteListItemDto } from './note-list.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NoteDeleteDto } from './note-delete.dto';

@ApiTags('笔记')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notes')
export class NoteController {
  constructor(private readonly noteService: NoteService) {}

  @Get()
  @ApiResponse({
    status: 200,
    description: '分页获取笔记',
    schema: {
      example: {
        list: [{ title: 'xxx', content: 'yyy' }],
        total: 11,
        total_page: 2,
        pagesize: 10,
      },
    },
  })
  async getNotes(
    @Req() req,
    @Query() query: NoteQueryDto,
  ): Promise<{
    list: NoteListItemDto[];
    total: number;
    total_page: number;
    pagesize: number;
  }> {
    const userId = req.user.sub;
    const { page = 1, pageSize = 10, title, content, type, isPublic } = query;
    const { data, total } = await this.noteService.findAll(
      userId,
      page,
      pageSize,
      title,
      content,
      type,
      isPublic,
    );
    return {
      list: data.map(
        ({ id, event, title, type, createdAt, updatedAt, userId }) => ({
          id,
          event: event || '',
          title: title || '',
          type,
          createdAt,
          updatedAt,
          userId,
        }),
      ),
      total,
      total_page: Math.ceil(total / pageSize),
      pagesize: pageSize,
    };
  }

  @Get(':id')
  @ApiResponse({ status: 200, type: NoteDto, description: '获取单条笔记' })
  async getNote(@Param('id') id: string, @Req() req): Promise<NoteDto | null> {
    const userId = req.user.sub;
    const note = await this.noteService.findById(id, userId);
    if (!note) return null;
    const { userId: _uid, ...dto } = note;
    return dto as NoteDto;
  }

  @Post('create-notes')
  @ApiBody({ type: NoteCreateDto, description: '新建笔记内容' })
  @ApiResponse({ status: 201, type: NoteDto, description: '创建新笔记' })
  async createNote(@Body() body: NoteCreateDto, @Req() req): Promise<NoteDto> {
    const userId = req.user.sub;
    const note = await this.noteService.create(body, userId);
    const { userId: _uid, ...dto } = note;
    return dto as NoteDto;
  }

  @Post('update')
  @ApiBody({
    type: NoteUpdateDto,
    description: '要更新的笔记内容（需包含id，可部分字段）',
  })
  @ApiResponse({ status: 200, type: NoteDto, description: '更新笔记' })
  async updateNote(
    @Req() req,
    @Body() dto: NoteUpdateDto,
  ): Promise<NoteDto | null> {
    const { id, ...rest } = dto;
    const userId = req.user.sub;
    const note = await this.noteService.update(id, userId, rest);
    if (!note) return null;
    const { userId: _uid, ...dtoResult } = note;
    return dtoResult as NoteDto;
  }

  @Post('delete')
  @ApiBody({ type: NoteDeleteDto, description: '要删除的笔记信息' })
  @ApiResponse({ status: 200, description: '删除笔记，返回是否成功' })
  async deleteNote(
    @Body() dto: NoteDeleteDto,
    @Req() req,
  ): Promise<{ success: boolean }> {
    const userId = req.user.sub;
    const success = await this.noteService.remove(dto.id, userId);
    return { success };
  }

  @Post('increment-self-view')
  @ApiResponse({ status: 200, description: '增加自己的查看次数' })
  async incrementSelfView(
    @Body('id') id: string,
    @Req() req,
  ): Promise<{ success: boolean }> {
    const userId = req.user.sub;
    const success = await this.noteService.incrementSelfView(id, userId);
    return { success };
  }

  @Post('increment-other-view')
  @ApiResponse({ status: 200, description: '增加他人的查看次数' })
  async incrementOtherView(
    @Body('id') id: string,
    @Req() req,
  ): Promise<{ success: boolean }> {
    const userId = req.user.sub;
    const success = await this.noteService.incrementOtherView(id, userId);
    return { success };
  }
}
