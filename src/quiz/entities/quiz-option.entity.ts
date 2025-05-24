import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';
import { QuizQuestion } from './quiz-question.entity';

@Entity('quiz_option')
export class QuizOption {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  content: string;

  @Column({ default: false })
  isCorrect: boolean;

  @Column({ type: 'int', default: 0 })
  order: number;

  @ManyToOne(() => QuizQuestion, (question) => question.options)
  question: QuizQuestion;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
