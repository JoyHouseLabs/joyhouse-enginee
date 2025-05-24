import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { Quiz } from './quiz.entity';
import { QuizOption } from './quiz-option.entity';

export enum QuestionType {
  SINGLE_CHOICE = 'single_choice',
  MULTIPLE_CHOICE = 'multiple_choice',
  ESSAY = 'essay',
}

@Entity('quiz_question')
export class QuizQuestion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  question: string;

  @Column({
    type: 'varchar',
    default: QuestionType.SINGLE_CHOICE,
  })
  type: QuestionType;

  @Column({ type: 'int', default: 0 })
  points: number;

  @Column({ type: 'text', nullable: true })
  explanation?: string;

  @Column({ type: 'text', nullable: true })
  referenceAnswer?: string;

  @ManyToOne(() => Quiz, (quiz) => quiz.questions)
  quiz: Quiz;

  @OneToMany(() => QuizOption, (option) => option.question)
  options: QuizOption[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
