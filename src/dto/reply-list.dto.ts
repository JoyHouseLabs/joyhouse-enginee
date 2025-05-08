import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReplyListItemDto {
  @ApiProperty() id: string;
  @ApiProperty() userId: string;
  @ApiProperty() target: string;
  @ApiProperty() targetId: string;
  @ApiProperty() content: string;
  @ApiPropertyOptional() mentionUserId?: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class ReplyListPageDto {
  @ApiProperty({ type: [ReplyListItemDto] })
  list: ReplyListItemDto[];
  @ApiProperty() total: number;
  @ApiProperty() total_page: number;
  @ApiProperty() pagesize: number;
}
