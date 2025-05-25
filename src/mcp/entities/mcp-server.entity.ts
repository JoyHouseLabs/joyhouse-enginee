import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { User } from '../../user/user.entity';

export enum McpServerStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error',
  CONNECTING = 'connecting',
}

export enum McpTransportType {
  STDIO = 'stdio',
  SSE = 'sse',
  WEBSOCKET = 'websocket',
}

@Entity('mcp_server')
export class McpServer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'text',
    default: McpTransportType.STDIO,
  })
  transportType: McpTransportType;

  @Column({ type: 'json' })
  config: {
    // STDIO配置
    command?: string;
    args?: string[];
    env?: Record<string, string>;

    // SSE配置
    url?: string;
    headers?: Record<string, string>;

    // WebSocket配置
    wsUrl?: string;

    // 通用配置
    timeout?: number;
    retryAttempts?: number;
    retryDelay?: number;
  };

  @Column({
    type: 'text',
    default: McpServerStatus.INACTIVE,
  })
  status: McpServerStatus;

  @Column({ type: 'text', nullable: true })
  lastError?: string;

  @Column({ type: 'timestamp', nullable: true })
  lastConnectedAt?: Date;

  @Column({ type: 'json', nullable: true })
  capabilities?: {
    tools?: boolean;
    resources?: boolean;
    prompts?: boolean;
    logging?: boolean;
  };

  @Column({ type: 'json', nullable: true })
  serverInfo?: {
    name?: string;
    version?: string;
    protocolVersion?: string;
  };

  @Column({ type: 'boolean', default: true })
  autoReconnect: boolean;

  @Column({ type: 'boolean', default: false })
  isPublic: boolean;

  @ManyToOne(() => User)
  user: User;

  @OneToMany('McpTool', 'server')
  tools: any[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
