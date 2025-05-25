import { ApiProperty } from '@nestjs/swagger';

export class StorageUploadResponseDto {
  @ApiProperty() url: string;
  @ApiProperty() filepath: string;
  @ApiProperty() filesize: number;
  @ApiProperty() filetype: string;
  @ApiProperty() filename: string;
  @ApiProperty() userId: string;
  @ApiProperty({ required: false, description: '所属目录ID' })
  storage_dir_id?: string;
}
