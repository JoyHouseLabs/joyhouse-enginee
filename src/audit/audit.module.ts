import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OperationLogController } from './operation-log.controller';
import { OperationLogService } from './operation-log.service';
import { OperationLogGateway } from './operation-log.gateway';
import { OperationLog } from './operation-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([OperationLog])],
  controllers: [OperationLogController],
  providers: [OperationLogService, OperationLogGateway],
  exports: [OperationLogService],
})
export class AuditModule {}
