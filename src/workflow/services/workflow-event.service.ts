import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WorkflowEngineService } from './workflow-engine.service';

@Injectable()
export class WorkflowEventService {
  private readonly logger = new Logger(WorkflowEventService.name);

  constructor(private readonly workflowEngine: WorkflowEngineService) {}

  @OnEvent('btc.price.change')
  async handleBtcPriceChange(data: { price: number; timestamp: Date }) {
    this.logger.log(`BTC price changed to: ${data.price}`);
    await this.workflowEngine.handleEvent('btc_price_change', data);
  }

  @OnEvent('weather.update')
  async handleWeatherUpdate(data: {
    location: string;
    temperature: number;
    condition: string;
    timestamp: Date;
  }) {
    this.logger.log(
      `Weather updated for ${data.location}: ${data.condition}, ${data.temperature}°C`,
    );
    await this.workflowEngine.handleEvent('weather_update', data);
  }

  @OnEvent('news.trending')
  async handleTrendingNews(data: {
    keywords: string[];
    articles: any[];
    timestamp: Date;
  }) {
    this.logger.log(`Trending news keywords: ${data.keywords.join(', ')}`);
    await this.workflowEngine.handleEvent('trending_news', data);
  }

  @OnEvent('user.action')
  async handleUserAction(data: {
    userId: string;
    action: string;
    data: any;
    timestamp: Date;
  }) {
    this.logger.log(`User ${data.userId} performed action: ${data.action}`);
    await this.workflowEngine.handleEvent('user_action', data);
  }

  @OnEvent('system.alert')
  async handleSystemAlert(data: {
    level: 'info' | 'warning' | 'error';
    message: string;
    source: string;
    timestamp: Date;
  }) {
    this.logger.log(
      `System alert [${data.level}] from ${data.source}: ${data.message}`,
    );
    await this.workflowEngine.handleEvent('system_alert', data);
  }

  @OnEvent('webhook.received')
  async handleWebhook(data: {
    url: string;
    method: string;
    headers: any;
    body: any;
    timestamp: Date;
  }) {
    this.logger.log(`Webhook received: ${data.method} ${data.url}`);
    await this.workflowEngine.handleEvent('webhook', data);
  }

  @OnEvent('schedule.trigger')
  async handleScheduleTrigger(data: {
    scheduleId: string;
    cron: string;
    timestamp: Date;
  }) {
    this.logger.log(`Schedule triggered: ${data.scheduleId} (${data.cron})`);
    await this.workflowEngine.handleEvent('schedule', data);
  }

  // Method to manually trigger events (for testing or external integrations)
  async triggerEvent(eventType: string, eventData: any): Promise<void> {
    this.logger.log(`Manually triggering event: ${eventType}`);
    await this.workflowEngine.handleEvent(eventType, eventData);
  }
}
