import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RelayListItemDto {
  @ApiProperty() id: string;
  @ApiProperty() ip: string;
  @ApiProperty() port: number;
  @ApiPropertyOptional() domain?: string;
  @ApiProperty() name: string;
  @ApiPropertyOptional() icon?: string;
  @ApiProperty() useDomain: boolean;
  @ApiPropertyOptional() description?: string;
  @ApiPropertyOptional() memo?: string;
  @ApiProperty() status: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
  @ApiProperty() userId: string;
}

export class RelayListPageDto {
  @ApiProperty({ type: [RelayListItemDto] })
  list: RelayListItemDto[];
  @ApiProperty() total: number;
  @ApiProperty() total_page: number;
  @ApiProperty() pagesize: number;
}
