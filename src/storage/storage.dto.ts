import { ApiProperty } from '@nestjs/swagger';

export class StorageUploadResponseDto {
  @ApiProperty() url: string;
  @ApiProperty() filepath: string;
  @ApiProperty() filesize: number;
  @ApiProperty() filetype: string;
  @ApiProperty() filename: string;
  @ApiProperty() user_id: string;
}
