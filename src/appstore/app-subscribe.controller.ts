import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AppSubscribeService } from './app-subscribe.service';
import { CreateAppSubscribeDto, UpdateAppSubscribeDto, AppSubscribeQueryDto } from './dto/app-subscribe.dto';
import { AppSubscribe } from './app-subscribe.entity';
import { User } from '../user/user.decorator';

@ApiTags('应用订阅')
@Controller('app-subscribes')
@UseGuards(JwtAuthGuard)
export class AppSubscribeController {
  constructor(private readonly appSubscribeService: AppSubscribeService) {}

  @Post()
  @ApiOperation({ summary: '创建应用订阅' })
  @ApiResponse({ status: 201, description: '创建成功', type: AppSubscribe })
  async create(
    @User('id') userId: string,
    @Body() createDto: CreateAppSubscribeDto,
  ): Promise<AppSubscribe> {
    return this.appSubscribeService.create(userId, createDto);
  }

  @Get()
  @ApiOperation({ summary: '获取订阅列表' })
  @ApiResponse({ status: 200, description: '获取成功', type: [AppSubscribe] })
  async findAll(@Query() query: AppSubscribeQueryDto): Promise<[AppSubscribe[], number]> {
    return this.appSubscribeService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取订阅详情' })
  @ApiResponse({ status: 200, description: '获取成功', type: AppSubscribe })
  async findOne(@Param('id') id: string): Promise<AppSubscribe> {
    return this.appSubscribeService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新订阅状态' })
  @ApiResponse({ status: 200, description: '更新成功', type: AppSubscribe })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateAppSubscribeDto,
  ): Promise<AppSubscribe> {
    return this.appSubscribeService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '取消订阅' })
  @ApiResponse({ status: 200, description: '取消成功', type: AppSubscribe })
  async unsubscribe(@Param('id') id: string): Promise<AppSubscribe> {
    return this.appSubscribeService.unsubscribe(id);
  }

  @Get('check/:appId')
  @ApiOperation({ summary: '检查订阅状态' })
  @ApiResponse({ status: 200, description: '检查成功', type: Boolean })
  async checkSubscription(
    @User('id') userId: string,
    @Param('appId') appId: string,
  ): Promise<boolean> {
    return this.appSubscribeService.checkSubscription(userId, appId);
  }
} 