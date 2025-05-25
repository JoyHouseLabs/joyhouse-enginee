import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { MeditationService } from './meditation.service';
import { CreateMeditationDto } from './meditation-create.dto';
import { UpdateMeditationDto } from './meditation-update.dto';
import { MeditationQueryDto } from './meditation-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

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
  findMyMeditations(@Req() req) {
    const userId = req.user.sub;
    return this.meditationService.findByUserId(userId);
  }

  @Get('detail')
  findOne(@Query('id') id: string) {
    return this.meditationService.findOne(id);
  }

  @Post('create')
  create(@Body() createMeditationDto: CreateMeditationDto, @Req() req) {
    const userId = req.user.sub;
    return this.meditationService.create(createMeditationDto, userId);
  }

  @Post('update')
  update(
    @Body('id') id: string,
    @Body() updateMeditationDto: UpdateMeditationDto,
    @Req() req,
  ) {
    const userId = req.user.sub;
    return this.meditationService.update(id, {
      ...updateMeditationDto,
      userId,
    });
  }

  @Post('delete')
  remove(@Body('id') id: string) {
    return this.meditationService.remove(id);
  }
}
