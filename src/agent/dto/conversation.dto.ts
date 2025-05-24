import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { MessageRole } from '../entities/conversation-history.entity';

export class CreateConversationDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  agentId: string;
}

export class UpdateConversationDto {
  @ApiProperty()
  @IsString()
  name: string;
}

export class CreateMessageDto {
  @ApiProperty({ enum: MessageRole })
  @IsEnum(MessageRole)
  role: MessageRole;

  @ApiProperty()
  @IsString()
  content: string;
}

export class UpdateMessageDto {
  @ApiProperty()
  @IsString()
  content: string;
}
