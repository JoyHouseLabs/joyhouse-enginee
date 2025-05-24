import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UserService } from './user.service';
import { AuthService } from '../auth/auth.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { JailUser } from './jail-user.entity';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from '../role/roles.guard';
import { Roles } from '../role/roles.decorator';
import { MoreThan } from 'typeorm';
import { UserDto, UpdateUserDto, UserQueryDto, UserListResponseDto } from './user.dto';
import { RoleType } from '../role/role.entity';

@ApiTags('管理员')
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleType.ADMIN)
export class AdminController {
  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(JailUser)
    private readonly jailUserRepo: Repository<JailUser>,
  ) {}

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

  @Get(':id')
  @ApiOperation({ summary: '获取用户信息' })
  @ApiResponse({ type: UserDto })
  async findOne(@Param('id') id: string): Promise<UserDto> {
    const user = await this.userService.findById(id);
    if (!user) {
      throw new Error('用户不存在');
    }
    return user;
  }

  @Put(':id')
  @ApiOperation({ summary: '更新用户信息' })
  @ApiResponse({ type: UserDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<UserDto> {
    return this.userService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除用户' })
  @ApiResponse({ description: '删除成功' })
  async delete(@Param('id') id: string): Promise<void> {
    await this.userService.delete(id);
  }

  @Post(':userId/jail')
  async jailUser(
    @Param('userId') userId: string,
    @Body() body: { reason: string; expiredAt: Date; operation: string },
    @Query('operator') operator: string,
  ) {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) {
      throw new Error('User not found');
    }

    const jailUser = this.jailUserRepo.create({
      user_id: userId,
      reason: body.reason,
      operation: body.operation,
      operator,
      expiredAt: body.expiredAt,
    });

    await this.jailUserRepo.save(jailUser);
    return jailUser;
  }

  @Get(':userId/jail')
  async getUserJailStatus(@Param('userId') userId: string) {
    const activeJail = await this.jailUserRepo.findOne({
      where: {
        user_id: userId,
        operation: 'login',
        expiredAt: MoreThan(new Date()),
      },
      order: { createdAt: 'DESC' },
    });

    return {
      isJailed: !!activeJail,
      jailInfo: activeJail,
    };
  }
} 