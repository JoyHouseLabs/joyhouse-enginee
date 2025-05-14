import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity()
export class Wallet {
  @ApiProperty() @PrimaryGeneratedColumn('uuid') id: string;
  @ApiProperty({ description: '主链类型（sol/evm）' }) @Column({ type: 'varchar', length: 16 }) mainchain: string;
  @ApiProperty({ description: '钱包地址' }) @Column({ type: 'varchar', length: 128 }) address: string;
  @ApiProperty({ description: '公钥' }) @Column({ type: 'varchar', length: 256 }) pubKey: string;
  @ApiProperty({ description: '加密存储的私钥' }) @Column({ type: 'varchar', length: 512 }) privateKey: string;
  @ApiProperty({ description: '加密存储的种子' }) @Column({ type: 'varchar', length: 512 }) seed: string;
  @ApiProperty({ description: '用户ID' }) @Column({ type: 'varchar', length: 26 }) userId: string;
}
