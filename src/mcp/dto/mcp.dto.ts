import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsObject,
  IsArray,
  IsNumber,
} from 'class-validator';
import { McpTransportType } from '../entities/mcp-server.entity';

export class CreateMcpServerDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(McpTransportType)
  transportType: McpTransportType;

  @IsObject()
  config: {
    command?: string;
    args?: string[];
    env?: Record<string, string>;
    url?: string;
    headers?: Record<string, string>;
    wsUrl?: string;
    timeout?: number;
    retryAttempts?: number;
    retryDelay?: number;
  };

  @IsOptional()
  @IsBoolean()
  autoReconnect?: boolean;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class UpdateMcpServerDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(McpTransportType)
  transportType?: McpTransportType;

  @IsOptional()
  @IsObject()
  config?: {
    command?: string;
    args?: string[];
    env?: Record<string, string>;
    url?: string;
    headers?: Record<string, string>;
    wsUrl?: string;
    timeout?: number;
    retryAttempts?: number;
    retryDelay?: number;
  };

  @IsOptional()
  @IsBoolean()
  autoReconnect?: boolean;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class ExecuteMcpToolDto {
  @IsString()
  toolName: string;

  @IsOptional()
  @IsObject()
  arguments?: Record<string, any>;
}

export class McpToolResponseDto {
  @IsString()
  toolName: string;

  @IsOptional()
  content?: any;

  @IsOptional()
  @IsBoolean()
  isError?: boolean;

  @IsOptional()
  @IsString()
  errorMessage?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class McpServerConnectionDto {
  @IsString()
  serverId: string;

  @IsOptional()
  @IsBoolean()
  force?: boolean;
}

export class McpToolListDto {
  @IsOptional()
  @IsString()
  serverId?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  availableOnly?: boolean;
}
