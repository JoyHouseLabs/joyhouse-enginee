import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { OperationLogService } from './operation-log.service';
import { OperationLog } from './operation-log.entity';
import { OperationLogQueryDto } from './dto/operation-log-query.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('操作日志')
@Controller('operation-log')
export class OperationLogController {
  constructor(private readonly logService: OperationLogService) {}

  @ApiOperation({ summary: '查询操作日志列表' })
  @ApiResponse({ status: 200, description: '返回操作日志列表' })
  @Get('list')
  async list(@Query() query: OperationLogQueryDto) {
    return this.logService.list(query);
  }
}
