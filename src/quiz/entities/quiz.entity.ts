import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { QuizQuestion } from './quiz-question.entity';

@Entity('quiz')
export class Quiz {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ default: false })
  isPublished: boolean;

  @OneToMany(() => QuizQuestion, (question) => question.quiz)
  questions: QuizQuestion[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
