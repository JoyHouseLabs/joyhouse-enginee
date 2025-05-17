import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OperationLog } from './operation-log.entity';
import { OperationLogService } from './operation-log.service';
import { OperationLogGateway } from './operation-log.gateway';

@Module({
  imports: [TypeOrmModule.forFeature([OperationLog])],
  providers: [OperationLogService, OperationLogGateway],
  exports: [OperationLogService, OperationLogGateway],
})
export class OperationLogModule {}
