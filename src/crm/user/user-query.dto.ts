import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsDate, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class CrmUserQueryDto {
  @ApiPropertyOptional({ description: '页码', default: '1' })
  @IsOptional()
  @IsString()
  page?: string = '1';

  @ApiPropertyOptional({ description: '每页数量', default: '20' })
  @IsOptional()
  @IsString()
  limit?: string = '20';

  @ApiPropertyOptional({ description: '用户名模糊搜索' })
  @IsOptional()
  @IsString()
  username?: string;
}

export class JailUserQueryDto {
  @ApiPropertyOptional({ description: '页码', default: '1' })
  @IsOptional()
  @IsString()
  page?: string = '1';

  @ApiPropertyOptional({ description: '每页数量', default: '20' })
  @IsOptional()
  @IsString()
  limit?: string = '20';

  @ApiPropertyOptional({ description: '用户ID' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: '操作人' })
  @IsOptional()
  @IsString()
  operator?: string;

  @ApiPropertyOptional({
    description: '是否只查询有效的封禁记录',
    default: 'true',
  })
  @IsOptional()
  @IsString()
  activeOnly?: string = 'true';
}

export class JailUserDto {
  @ApiProperty({ description: '用户ID' })
  @IsNotEmpty()
  @IsString()
  userId: string;

  @ApiProperty({ description: '封禁原因' })
  @IsNotEmpty()
  @IsString()
  reason: string;

  @ApiProperty({ description: '封禁到期时间' })
  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  expiredAt: Date;

  @ApiProperty({ description: '操作类型' })
  @IsNotEmpty()
  @IsString()
  operation: string;

  @ApiProperty({ description: '操作人' })
  @IsNotEmpty()
  @IsString()
  operator: string;
}

export class UnjailUserDto {
  @ApiProperty({ description: '封禁记录ID' })
  @IsNotEmpty()
  @IsString()
  id: string;

  @ApiProperty({ description: '操作人' })
  @IsNotEmpty()
  @IsString()
  operator: string;

  @ApiProperty({ description: '解除原因' })
  @IsNotEmpty()
  @IsString()
  reason: string;
}
