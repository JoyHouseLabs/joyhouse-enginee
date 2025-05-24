import { Controller, Get, Query, Post, Body, Param, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, MoreThan } from 'typeorm';
import { User } from '../../user/user.entity';
import { UserDto } from '../../user/user.dto';
import { CrmUserQueryDto, JailUserDto, JailUserQueryDto, UnjailUserDto } from './user-query.dto';
import { JailUser } from '../../user/jail-user.entity';
import { JwtAuthGuard } from '../../user/jwt-auth.guard';

@ApiTags('CRM')
@Controller('crm/users')
export class CrmUserController {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(JailUser)
    private readonly jailUserRepo: Repository<JailUser>,
  ) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, description: '系统所有用户（分页）' })
  async findAll(@Query() query: CrmUserQueryDto) {
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '20', 10);
    
    if (isNaN(page) || page < 1 || isNaN(limit) || limit < 1) {
      throw new Error('Invalid page or limit parameters');
    }

    const where: any = {};
    if (query.username) {
      where.username = Like(`%${query.username}%`);
    }
    const [users, total] = await this.userRepo.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });
    const list = users.map(({ password, ...user }) => user as UserDto);
    return { list, total, page, limit };
  }

  @Get('jail')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, description: '获取封禁用户列表' })
  async findAllJailUsers(@Query() query: JailUserQueryDto) {
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '20', 10);
    
    if (isNaN(page) || page < 1 || isNaN(limit) || limit < 1) {
      throw new Error('Invalid page or limit parameters');
    }

    const where: any = {};
    if (query.userId) {
      where.user_id = query.userId;
    }
    if (query.operator) {
      where.operator = query.operator;
    }
    if (query.activeOnly === 'true') {
      where.expiredAt = MoreThan(new Date());
    }

    const [jailUsers, total] = await this.jailUserRepo.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
      relations: {
        user: true
      },
    });

    // Transform the response to include user information without sensitive data
    const list = jailUsers.map(jailUser => ({
      ...jailUser,
      user: jailUser.user ? {
        id: jailUser.user.id,
        username: jailUser.user.username,
        nickname: jailUser.user.nickname,
        avatar: jailUser.user.avatar,
        createdAt: jailUser.user.createdAt,
        updatedAt: jailUser.user.updatedAt
      } : null
    }));

    return { list, total, page, limit };
  }

  @Post('jail')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, description: '封禁用户' })
  async jailUser(@Body() body: JailUserDto, @Req() req) {
    const user = await this.userRepo.findOneBy({ id: body.userId });
    if (!user) {
      throw new Error('User not found');
    }

    const operatorId = req.user.sub;
    if (!operatorId) {
      throw new Error('Current user not found');
    }

    const jailUser = this.jailUserRepo.create({
      user_id: body.userId,
      reason: body.reason,
      operation: body.operation,
      operator: operatorId,
      expiredAt: body.expiredAt,
    });

    await this.jailUserRepo.save(jailUser);
    return jailUser;
  }

  @Post('unjail')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, description: '解除用户封禁' })
  async unjailUser(@Body() body: UnjailUserDto, @Req() req) {
    const jailUser = await this.jailUserRepo.findOneBy({ id: body.id });
    if (!jailUser) {
      throw new Error('Jail record not found');
    }

    const operatorId = req.user.sub;
    if (!operatorId) {
      throw new Error('Current user not found');
    }

    // 将过期时间设置为当前时间，使其立即失效
    jailUser.expiredAt = new Date();
    // 记录解除封禁的操作信息
    jailUser.operation = 'unjail';
    jailUser.operator = operatorId;
    jailUser.reason = body.reason;
    
    await this.jailUserRepo.save(jailUser);
    return { message: 'User has been unjailed', record: jailUser };
  }

  @Get(':userId/jail')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, description: '获取用户封禁状态' })
  async getUserJailStatus(@Param('userId') userId: string) {
    const activeJail = await this.jailUserRepo.findOne({
      where: {
        user_id: userId,
        operation: 'login',
        expiredAt: MoreThan(new Date()),
      },
      order: { createdAt: 'DESC' },
      relations: {
        user: true
      }
    });

    return {
      isJailed: !!activeJail,
      jailInfo: activeJail ? {
        ...activeJail,
        user: activeJail.user ? {
          id: activeJail.user.id,
          username: activeJail.user.username,
          nickname: activeJail.user.nickname,
          avatar: activeJail.user.avatar,
          createdAt: activeJail.user.createdAt,
          updatedAt: activeJail.user.updatedAt
        } : null
      } : null
    };
  }
}
