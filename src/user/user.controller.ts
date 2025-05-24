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
    const { page = 1, limit = 10 } = query;
    const { list, total } = await this.userService.findAll(page, limit);
    return {
      list,
      total,
      page,
      limit,
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
}
