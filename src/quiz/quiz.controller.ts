import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { QuizService } from './quiz.service';
import { CreateQuizDto, UpdateQuizDto } from './dto/quiz.dto';
import { Quiz } from './entities/quiz.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('测验')
@Controller('quiz')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  @Post()
  @ApiOperation({ summary: '创建测验' })
  @ApiResponse({ type: Quiz })
  create(@Body() createQuizDto: CreateQuizDto) {
    return this.quizService.create(createQuizDto);
  }

  @Get()
  @ApiOperation({ summary: '获取所有测验' })
  @ApiResponse({ type: [Quiz] })
  findAll() {
    return this.quizService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '获取指定测验' })
  @ApiResponse({ type: Quiz })
  findOne(@Param('id') id: string) {
    return this.quizService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新测验' })
  @ApiResponse({ type: Quiz })
  update(@Param('id') id: string, @Body() updateQuizDto: UpdateQuizDto) {
    return this.quizService.update(id, updateQuizDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除测验' })
  @ApiResponse({ description: '删除成功' })
  remove(@Param('id') id: string) {
    return this.quizService.remove(id);
  }
} 