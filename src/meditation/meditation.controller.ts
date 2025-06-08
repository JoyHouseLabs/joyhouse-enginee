import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MeditationService } from './meditation.service';
import { CreateMeditationDto } from './meditation-create.dto';
import { UpdateMeditationDto } from './meditation-update.dto';
import { MeditationQueryDto } from './meditation-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { User } from '../user/user.decorator';

@ApiTags('Meditation')
@ApiBearerAuth()
@Controller('meditations')
@UseGuards(JwtAuthGuard)
export class MeditationController {
  constructor(private readonly meditationService: MeditationService) {}

  @Get('list')
  findAll(@Query() query: MeditationQueryDto) {
    return this.meditationService.findAll(query);
  }

  @Get('my')
  findMyMeditations(@User('id') userId: string, @Query() query: MeditationQueryDto) {
    return this.meditationService.findByUserId(userId, query);
  }

  @Get('detail')
  findOne(@Query('id') id: string) {
    return this.meditationService.findOne(id);
  }

  @Post('create')
  create(@User('id') userId: string, @Body() createMeditationDto: CreateMeditationDto) {
    return this.meditationService.create(createMeditationDto, userId);
  }

  @Post('update')
  update(
    @User('id') userId: string,
    @Body('id') id: string,
    @Body() updateMeditationDto: UpdateMeditationDto,
  ) {
    return this.meditationService.update(id, {
      ...updateMeditationDto,
      userId,
    });
  }

  @Post('delete')
  remove(@User('id') userId: string, @Body('id') id: string) {
    return this.meditationService.remove(id, userId);
  }
}
