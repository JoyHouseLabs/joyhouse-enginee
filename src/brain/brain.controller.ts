import {
  Controller,
  Post,
  Body,
  Sse,
  MessageEvent,
  Req,
  UseGuards,
} from '@nestjs/common';
import { BrainService } from './brain.service';
import { JwtAuthGuard } from '../user/jwt-auth.guard';

@Controller('brain')
@UseGuards(JwtAuthGuard)
export class BrainController {
  constructor(private readonly brainService: BrainService) {}

  // 普通 HTTP 调用
  @Post('structure')
  async structureContent(@Req() req, @Body('content') content: string) {
    return this.brainService.structureContent(content, req.user.sub);
  }

  // 流式 SSE 调用
  @Sse('structure/stream')
  streamStructureContent(
    @Req() req,
    @Body('content') content: string,
  ): AsyncIterable<MessageEvent> {
    return this.brainService.streamStructureContent(content, req.user.sub);
  }
}
