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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../role/role.guard';

@ApiTags('奖励')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('rewards')
export class RewardController {
  constructor(private readonly rewardService: RewardService) {}

  @Post()
  @ApiResponse({ status: 201, description: '创建奖励成功' })
  async create(@Body() createRewardDto: CreateRewardDto): Promise<RewardDto> {
    return this.rewardService.create(createRewardDto);
  }

  @Get()
  @ApiResponse({ status: 200, description: '获取奖励列表成功' })
  async findAll(
    @Query() query: RewardQueryDto,
  ): Promise<RewardListResponseDto> {
    return this.rewardService.findAll(query);
  }

  @Get(':id')
  @ApiResponse({ status: 200, description: '获取奖励详情成功' })
  async findOne(@Param('id') id: string): Promise<RewardDto> {
    return this.rewardService.findOne(id);
  }

  @Put(':id')
  @ApiResponse({ status: 200, description: '更新奖励成功' })
  async update(
    @Param('id') id: string,
    @Body() updateRewardDto: UpdateRewardDto
  ): Promise<RewardDto> {
    updateRewardDto.id = id;
    return this.rewardService.update(updateRewardDto);
  }

  @Delete(':id')
  @ApiResponse({ status: 200, description: '删除奖励成功' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.rewardService.remove(id);
  }

  @Post('grant')
  @ApiResponse({ status: 201, type: UserRewardDto })
  async grantReward(@Body() dto: CreateUserRewardDto): Promise<UserRewardDto> {
    return this.rewardService.grantReward(dto);
  }

  @Get('user/:userId')
  @ApiResponse({ status: 200, type: [UserRewardDto] })
  async getUserRewards(
    @Param('userId') userId: string,
    @Query()
    query: { page?: string; limit?: string; type?: string; task_id?: string },
  ) {
    return this.rewardService.getUserRewards(userId, query);
  }
}
