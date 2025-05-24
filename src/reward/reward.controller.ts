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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RewardService } from './reward.service';
import {
  CreateRewardDto,
  UpdateRewardDto,
  RewardQueryDto,
  RewardDto,
  RewardListResponseDto,
} from './reward.dto';
import { CreateUserRewardDto, UserRewardDto } from './user-reward.dto';
import { JwtAuthGuard } from '../user/jwt-auth.guard';
import { RoleGuard } from '../role/role.guard';

@ApiTags('rewards')
@UseGuards(JwtAuthGuard, RoleGuard)
@ApiBearerAuth()
@Controller('rewards')
export class RewardController {
  constructor(private readonly rewardService: RewardService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建奖励' })
  @ApiResponse({ status: 201, description: '成功创建奖励', type: RewardDto })
  async create(@Body() createDto: CreateRewardDto): Promise<RewardDto> {
    return this.rewardService.create(createDto);
  }

  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新奖励' })
  @ApiResponse({ status: 200, description: '成功更新奖励', type: RewardDto })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateRewardDto,
  ): Promise<RewardDto> {
    updateDto.id = id;
    return this.rewardService.update(updateDto);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取奖励详情' })
  @ApiResponse({ status: 200, description: '返回奖励详情', type: RewardDto })
  async findOne(@Param('id') id: string): Promise<RewardDto> {
    return this.rewardService.findOne(id);
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取奖励列表' })
  @ApiResponse({
    status: 200,
    description: '返回奖励列表',
    type: RewardListResponseDto,
  })
  async findAll(
    @Query() query: RewardQueryDto,
  ): Promise<RewardListResponseDto> {
    return this.rewardService.findAll(query);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除奖励' })
  @ApiResponse({ status: 200, description: '成功删除奖励' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.rewardService.remove(id);
  }

  @Post('grant')
  @ApiBearerAuth()
  @ApiOperation({ summary: '发放奖励' })
  @ApiResponse({ status: 201, type: UserRewardDto })
  async grantReward(@Body() dto: CreateUserRewardDto): Promise<UserRewardDto> {
    return this.rewardService.grantReward(dto);
  }

  @Get('user/:userId')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取用户奖励列表' })
  @ApiResponse({ status: 200, type: [UserRewardDto] })
  async getUserRewards(
    @Param('userId') userId: string,
    @Query()
    query: { page?: string; limit?: string; type?: string; task_id?: string },
  ) {
    return this.rewardService.getUserRewards(userId, query);
  }
}
