import { Controller, Get, Post, Body, Param, Query, UseGuards, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AppStoreService } from './appstore.service';
import { App } from './app.entity';
import { CreateAppDto, UpdateAppDto, AppQueryDto } from './dto/app.dto';
import { User } from '../user/user.decorator';

@ApiTags('应用商店')
@Controller('appstore')
@UseGuards(JwtAuthGuard)
export class AppStoreController {
  constructor(private readonly appStoreService: AppStoreService) {}

  @Post()
  @ApiOperation({ summary: '创建应用' })
  @ApiResponse({ status: 201, description: '创建成功', type: App })
  async create(
    @User('id') userId: string,
    @Body() createDto: CreateAppDto,
  ): Promise<App> {
    return this.appStoreService.create(userId, createDto);
  }

  @Get()
  @ApiOperation({ summary: '获取应用列表' })
  @ApiResponse({ status: 200, description: '获取成功', type: App })
  async findAll(@Query() query: AppQueryDto) {
    return this.appStoreService.findAll(query);
  }

  @Get('recommanded')
  @ApiOperation({ summary: '获取推荐应用列表' })
  @ApiResponse({ status: 200, description: '获取成功', type: [App] })
  async getRecommandedApps(): Promise<App[]> {
    return this.appStoreService.getRecommandedApps();
  }

  @Get(':id')
  @ApiOperation({ summary: '获取应用详情' })
  @ApiResponse({ status: 200, description: '获取成功', type: App })
  async findOne(@Param('id') id: string): Promise<App> {
    return this.appStoreService.findOne(id);
  }

  @Post(':id')
  @ApiOperation({ summary: '更新应用' })
  @ApiResponse({ status: 200, description: '更新成功', type: App })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateAppDto,
  ): Promise<App> {
    return this.appStoreService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除应用' })
  @ApiResponse({ status: 200, description: '删除成功' })
  async remove(
    @Param('id') id: string,
    @User('id') userId: string,
  ): Promise<void> {
    return this.appStoreService.remove(id, userId);
  }
} 