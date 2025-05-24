import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { User } from '../../user/user.entity';

export enum ToolType {
  HTTP = 'http',
  SSE = 'sse',
  WEBSOCKET = 'websocket'
}

export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH'
}

@Entity('tool')
export class Tool {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  icon?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'text', nullable: true })
  prompt?: string;

  @Column({ type: 'json', nullable: true })
  fewShot?: Array<{
    input: string;
    output: any;
    description?: string;
  }>;

  @Column({
    type: 'text',
    default: ToolType.HTTP
  })
  type: ToolType;

  @Column({ type: 'json', nullable: true })
  headers?: Record<string, string>;

  @Column({
    type: 'text',
    default: HttpMethod.GET,
    nullable: true
  })
  method?: HttpMethod;

  @Column({ type: 'text' })
  url: string;

  @Column({ type: 'json', nullable: true })
  requestParams?: {
    query?: Record<string, string>;
    body?: Record<string, any>;
    path?: Record<string, string>;
  };

  @Column({ type: 'json', nullable: true })
  responseSchema?: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };

  @Column({ type: 'json', nullable: true })
  auth?: {
    type: 'none' | 'basic' | 'bearer' | 'apiKey';
    username?: string;
    password?: string;
    token?: string;
    key?: string;
    value?: string;
    in?: 'header' | 'query' | 'cookie';
  };

  @Column({ type: 'boolean', default: false })
  isPublic: boolean;

  @ManyToOne(() => User)
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 