import { Controller, Get, Post, Body } from '@nestjs/common';
import { OperationLogService } from './operation-log.service';
import { OperationLog } from './operation-log.entity';

@Controller('operation-log')
export class OperationLogController {
  constructor(private readonly logService: OperationLogService) {}

  // 查询操作日志，支持按user_id、action等过滤
  @Post('list')
  async list(
    @Body()
    dto: {
      user_id?: string;
      action?: string;
      skip?: number;
      take?: number;
    },
  ): Promise<OperationLog[]> {
    return this.logService.list(dto);
  }
}
