import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reply } from './reply.entity';
import { ReplyService } from './reply.service';
import { ReplyController } from './reply.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Reply])],
  providers: [ReplyService],
  controllers: [ReplyController],
  exports: [ReplyService],
})
export class ReplyModule {}
