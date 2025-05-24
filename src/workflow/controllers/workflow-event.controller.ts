import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { WorkflowEventService } from '../services/workflow-event.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { EventEmitter2 } from '@nestjs/event-emitter';

export class TriggerEventDto {
  eventType: string;
  eventData: any;
}

@ApiTags('workflow-events')
@Controller('workflow-events')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class WorkflowEventController {
  constructor(
    private readonly workflowEventService: WorkflowEventService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Post('trigger')
  @ApiOperation({ summary: '手动触发事件' })
  @ApiResponse({ description: '事件触发成功' })
  async triggerEvent(@Body() triggerEventDto: TriggerEventDto) {
    await this.workflowEventService.triggerEvent(
      triggerEventDto.eventType,
      triggerEventDto.eventData,
    );
    return { message: 'Event triggered successfully' };
  }

  @Post('btc-price')
  @ApiOperation({ summary: '触发BTC价格变化事件' })
  @ApiResponse({ description: 'BTC价格事件触发成功' })
  async triggerBtcPrice(@Body() data: { price: number }) {
    this.eventEmitter.emit('btc.price.change', {
      price: data.price,
      timestamp: new Date(),
    });
    return { message: 'BTC price event triggered' };
  }

  @Post('weather')
  @ApiOperation({ summary: '触发天气更新事件' })
  @ApiResponse({ description: '天气事件触发成功' })
  async triggerWeather(
    @Body() data: { location: string; temperature: number; condition: string },
  ) {
    this.eventEmitter.emit('weather.update', {
      ...data,
      timestamp: new Date(),
    });
    return { message: 'Weather event triggered' };
  }

  @Post('trending-news')
  @ApiOperation({ summary: '触发热点新闻事件' })
  @ApiResponse({ description: '新闻事件触发成功' })
  async triggerTrendingNews(
    @Body() data: { keywords: string[]; articles: any[] },
  ) {
    this.eventEmitter.emit('news.trending', {
      ...data,
      timestamp: new Date(),
    });
    return { message: 'Trending news event triggered' };
  }

  @Post('webhook')
  @ApiOperation({ summary: '模拟Webhook事件' })
  @ApiResponse({ description: 'Webhook事件触发成功' })
  async triggerWebhook(
    @Body() data: { url: string; method: string; headers: any; body: any },
  ) {
    this.eventEmitter.emit('webhook.received', {
      ...data,
      timestamp: new Date(),
    });
    return { message: 'Webhook event triggered' };
  }
}
