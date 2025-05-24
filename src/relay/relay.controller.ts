import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiResponse, ApiBody } from '@nestjs/swagger';
import { RelayService } from './relay.service';
import { UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../user/jwt-auth.guard';
import { CreateRelayDto, UpdateRelayDto } from './relay.dto';
import { RelayListItemDto, RelayListPageDto } from './relay-list.dto';

@ApiTags('Relay')
@UseGuards(JwtAuthGuard)
@Controller('relay')
export class RelayController {
  constructor(private readonly relayService: RelayService) {}

  @Get('list')
  @ApiResponse({
    status: 200,
    type: RelayListPageDto,
    description: '分页获取relay',
  })
  async getRelays(
    @Req() req,
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 10,
    @Query('name') name?: string,
  ): Promise<RelayListPageDto> {
    const userId = req.user.sub;
    const { data, total } = await this.relayService.findAll(
      page,
      pageSize,
      name,
      userId,
    );
    return {
      list: data.map(
        ({
          id,
          host,
          name,
          icon,
          description,
          memo,
          status,
          createdAt,
          updatedAt,
          userId,
        }) => ({
          id,
          host,
          name,
          icon,
          description,
          memo,
          status,
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
  @ApiResponse({
    status: 200,
    type: RelayListItemDto,
    description: '获取单条relay',
  })
  async getRelay(@Param('id') id: string, @Req() req) {
    const userId = req.user.sub;
    return this.relayService.findById(id, userId);
  }

  @Post('/create')
  @ApiBody({ type: CreateRelayDto, description: '新建relay' })
  @ApiResponse({
    status: 201,
    type: RelayListItemDto,
    description: '创建新relay',
  })
  async createRelay(@Body() body: CreateRelayDto, @Req() req) {
    const userId = req.user.sub;
    const relay = await this.relayService.create({ ...body, userId });
    return relay;
  }

  @Post('update')
  @ApiBody({
    type: UpdateRelayDto,
    description: '要更新的relay内容（需包含id，可部分字段）',
  })
  @ApiResponse({
    status: 200,
    type: RelayListItemDto,
    description: '更新relay',
  })
  async updateRelay(@Req() req, @Body() dto: UpdateRelayDto) {
    const { id, ...rest } = dto;
    return this.relayService.update(id, { ...rest, userId: req.user.sub });
  }

  @Post('delete')
  @ApiResponse({ status: 200, description: '删除relay，返回是否成功' })
  async removeRelay(@Body() body: { id: string }) {
    return this.relayService.remove(body.id);
  }
}
