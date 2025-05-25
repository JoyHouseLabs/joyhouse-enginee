import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';
import { User } from '../../user/user.entity';
import { McpServer } from './mcp-server.entity';

@Entity('mcp_tool')
export class McpTool {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'json' })
  inputSchema: {
    type: string;
    properties?: Record<string, any>;
    required?: string[];
    additionalProperties?: boolean;
  };

  @Column({ type: 'json', nullable: true })
  outputSchema?: {
    type: string;
    properties?: Record<string, any>;
  };

  @Column({ type: 'json', nullable: true })
  examples?: Array<{
    input: Record<string, any>;
    output?: any;
    description?: string;
  }>;

  @Column({ type: 'boolean', default: true })
  isAvailable: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastUsedAt?: Date;

  @Column({ type: 'integer', default: 0 })
  usageCount: number;

  @Column({ type: 'json', nullable: true })
  metadata?: {
    category?: string;
    tags?: string[];
    version?: string;
    author?: string;
  };

  @ManyToOne(() => McpServer, (server) => server.tools)
  server: McpServer;

  @ManyToOne(() => User)
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
