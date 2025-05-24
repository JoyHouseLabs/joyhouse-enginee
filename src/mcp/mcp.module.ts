import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { McpController } from './mcp.controller';
import { McpService } from './services/mcp.service';
import { McpClientService } from './services/mcp-client.service';
import { McpServer } from './entities/mcp-server.entity';
import { McpTool } from './entities/mcp-tool.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([McpServer, McpTool]),
    ScheduleModule.forRoot(),
  ],
  controllers: [McpController],
  providers: [McpService, McpClientService],
  exports: [McpService, McpClientService],
})
export class McpModule {}
