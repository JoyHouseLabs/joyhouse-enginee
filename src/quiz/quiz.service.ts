import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quiz } from './entities/quiz.entity';
import { QuizQuestion } from './entities/quiz-question.entity';
import { QuizOption } from './entities/quiz-option.entity';
import { CreateQuizDto, UpdateQuizDto } from './dto/quiz.dto';

@Injectable()
export class QuizService {
  constructor(
    @InjectRepository(Quiz)
    private readonly quizRepo: Repository<Quiz>,
    @InjectRepository(QuizQuestion)
    private readonly questionRepo: Repository<QuizQuestion>,
    @InjectRepository(QuizOption)
    private readonly optionRepo: Repository<QuizOption>,
  ) {}

  async create(createQuizDto: CreateQuizDto): Promise<Quiz> {
    const quiz = this.quizRepo.create({
      title: createQuizDto.title,
      description: createQuizDto.description,
    });

    const savedQuiz = await this.quizRepo.save(quiz);

    // 创建问题和选项
    for (const questionDto of createQuizDto.questions) {
      const question = this.questionRepo.create({
        ...questionDto,
        quiz: savedQuiz,
      });
      const savedQuestion = await this.questionRepo.save(question);

      if (questionDto.options) {
        for (const optionDto of questionDto.options) {
          const option = this.optionRepo.create({
            ...optionDto,
            question: savedQuestion,
          });
          await this.optionRepo.save(option);
        }
      }
    }

    return this.findOne(savedQuiz.id);
  }

  async findAll(): Promise<Quiz[]> {
    return this.quizRepo.find({
      relations: ['questions', 'questions.options'],
    });
  }

  async findOne(id: string): Promise<Quiz> {
    const quiz = await this.quizRepo.findOne({
      where: { id },
      relations: ['questions', 'questions.options'],
    });

    if (!quiz) {
      throw new NotFoundException(`Quiz with ID ${id} not found`);
    }

    return quiz;
  }

  async update(id: string, updateQuizDto: UpdateQuizDto): Promise<Quiz> {
    const quiz = await this.findOne(id);

    // 更新基本信息
    Object.assign(quiz, {
      title: updateQuizDto.title,
      description: updateQuizDto.description,
      isPublished: updateQuizDto.isPublished,
    });

    // 删除旧的问题和选项
    await this.questionRepo.delete({ quiz: { id } });

    // 创建新的问题和选项
    for (const questionDto of updateQuizDto.questions) {
      const question = this.questionRepo.create({
        ...questionDto,
        quiz,
      });
      const savedQuestion = await this.questionRepo.save(question);

      if (questionDto.options) {
        for (const optionDto of questionDto.options) {
          const option = this.optionRepo.create({
            ...optionDto,
            question: savedQuestion,
          });
          await this.optionRepo.save(option);
        }
      }
    }

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const quiz = await this.findOne(id);
    await this.quizRepo.remove(quiz);
  }
} 