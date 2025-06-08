import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsNumber, IsEnum, Min, Max } from 'class-validator';
import { ThemeType, FontType } from './user-settings.entity';

export class NotionStyleDto {
  @ApiPropertyOptional({ enum: ['light', 'dark'], default: 'light' })
  @IsOptional()
  @IsEnum(['light', 'dark'])
  theme?: ThemeType;

  @ApiPropertyOptional({ enum: ['sans', 'serif', 'mono'], default: 'sans' })
  @IsOptional()
  @IsEnum(['sans', 'serif', 'mono'])
  font?: FontType;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  smallText?: boolean;
}

export class ModelSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  defaultModel?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 2, default: 0.7 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @ApiPropertyOptional({ minimum: 1, default: 2000 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxTokens?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 1, default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  topP?: number;

  @ApiPropertyOptional({ minimum: -2, maximum: 2, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(-2)
  @Max(2)
  frequencyPenalty?: number;

  @ApiPropertyOptional({ minimum: -2, maximum: 2, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(-2)
  @Max(2)
  presencePenalty?: number;
}

export class UsageLimitsDto {
  @ApiPropertyOptional({ minimum: 0, default: 1000000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyTokens?: number;

  @ApiPropertyOptional({ minimum: 0, default: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyCost?: number;

  @ApiPropertyOptional({ minimum: 0, default: 50 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  autoPaymentLimit?: number;
}

export class UserSettingsCreateDto {
  @ApiPropertyOptional()
  @IsOptional()
  notionStyle?: NotionStyleDto;

  @ApiPropertyOptional()
  @IsOptional()
  modelSettings?: ModelSettingsDto;

  @ApiPropertyOptional()
  @IsOptional()
  usageLimits?: UsageLimitsDto;
}

export class UserSettingsUpdateDto extends UserSettingsCreateDto {
  @ApiProperty()
  @IsString()
  id: string;
} 