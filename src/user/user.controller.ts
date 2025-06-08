import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Logger,
  Req,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UserService } from './user.service';
import {
  UserDto,
  UpdateUserDto,
  UserQueryDto,
  UserListResponseDto,
} from './user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../decorators/user.decorator';
import { UserSettingsCreateDto, UserSettingsUpdateDto } from './user-settings.dto';

@ApiTags('用户')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(private readonly userService: UserService) {}

  @Get()
  @ApiOperation({ summary: '获取用户列表' })
  @ApiResponse({ type: UserListResponseDto })
  async findAll(@Query() query: UserQueryDto): Promise<UserListResponseDto> {
    const { page = 1, pageSize = 10 } = query;
    const { items, total } = await this.userService.findAll(page, pageSize);
    return {
      items,
      total,
      page,
      pageSize,
    };
  }

  @Get('profile')
  @ApiOperation({ summary: '获取当前用户信息' })
  @ApiResponse({ type: UserDto })
  async getProfile(@User() user: UserDto): Promise<UserDto> {
    this.logger.debug('Current user:', JSON.stringify(user, null, 2));
    return user;
  }

  @Put('profile')
  @ApiOperation({ summary: '更新当前用户信息' })
  @ApiResponse({ type: UserDto })
  async updateProfile(
    @User() user: UserDto,
    @Body() dto: UpdateUserDto,
  ): Promise<UserDto> {
    this.logger.debug('Updating user:', JSON.stringify(user, null, 2));
    return this.userService.update(user.id, dto);
  }

  @Put('profile/property')
  @ApiOperation({ summary: '设置用户属性' })
  @ApiResponse({ type: UserDto })
  async setUserProperty(
    @User() user: UserDto,
    @Body() dto: { key?: string; value?: string },
  ): Promise<void> {
    this.logger.debug(
      'Setting property for user:',
      JSON.stringify(user, null, 2),
    );
    await this.userService.setUserProperty(user.id, dto);
  }

  // 查询当前用户的自动内容清洗配置
  @Get('auto-extract-content')
  async getAutoExtractContent(@Req() req) {
    const user = await this.userService.findById(req.user.id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return { auto_extract_content: user.auto_extract_content };
  }

  // 设置当前用户的自动内容清洗配置
  @Post('auto-extract-content')
  async setAutoExtractContent(@Req() req, @Body() body: { auto_extract_content: boolean }) {
    await this.userService.update(req.user.id, { auto_extract_content: body.auto_extract_content })
    return { success: true }
  }

  @Get('settings')
  @ApiResponse({ status: 200, description: '获取用户设置' })
  async getUserSettings(@Req() req) {
    return this.userService.getUserSettings(req.user.id);
  }

  @Post('settings')
  @ApiResponse({ status: 201, description: '创建用户设置' })
  async createUserSettings(@Req() req, @Body() dto: UserSettingsCreateDto) {
    return this.userService.createUserSettings(req.user.id, dto);
  }

  @Post('settings/update')
  @ApiResponse({ status: 200, description: '更新用户设置' })
  async updateUserSettings(@Req() req, @Body() dto: UserSettingsUpdateDto) {
    return this.userService.updateUserSettings(req.user.id, dto);
  }

  @Delete('settings/:id')
  @ApiResponse({ status: 200, description: '删除用户设置' })
  async deleteUserSettings(@Req() req, @Param('id') id: string) {
    return this.userService.deleteUserSettings(req.user.id, id);
  }
}
