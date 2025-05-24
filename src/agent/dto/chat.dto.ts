import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class ChatRequestDto {
  @ApiProperty({ description: '用户输入的消息内容' })
  @IsString()
  @IsNotEmpty()
  message: string;
} 