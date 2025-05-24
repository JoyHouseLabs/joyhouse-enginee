import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuizService } from './quiz.service';
import { QuizController } from './quiz.controller';
import { Quiz } from './entities/quiz.entity';
import { QuizQuestion } from './entities/quiz-question.entity';
import { QuizOption } from './entities/quiz-option.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Quiz, QuizQuestion, QuizOption])],
  controllers: [QuizController],
  providers: [QuizService],
  exports: [QuizService],
})
export class QuizModule {}
