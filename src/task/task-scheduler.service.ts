import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { Task } from './task.entity';
import { TaskStatus, TaskType } from './task-query.dto';
import * as os from 'os';

@Injectable()
export class TaskSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly timezone = 'Asia/Shanghai'; // 使用中国时区
  private readonly logger = new Logger(TaskSchedulerService.name);
  private readonly platform = os.platform();
  private systemMonitorJob: CronJob;

  constructor(
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    private schedulerRegistry: SchedulerRegistry,
  ) {
    this.logger.log(`TaskSchedulerService initialized on ${this.platform}`);
  }

  async onModuleInit() {
    try {
      this.logger.log('Initializing task scheduler...');
      await this.loadCronTasks();
      this.initializeSystemMonitor();
      this.logger.log('Task scheduler initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize task scheduler:', error);
    }
  }

  async onModuleDestroy() {
    try {
      this.logger.log('Cleaning up task scheduler...');
      // 停止系统监控任务
      if (this.systemMonitorJob) {
        this.systemMonitorJob.stop();
      }
      const jobs = this.schedulerRegistry.getCronJobs();
      jobs.forEach((job, key) => {
        job.stop();
        this.schedulerRegistry.deleteCronJob(key);
        this.logger.log(`Stopped and removed job: ${key}`);
      });
      this.logger.log('Task scheduler cleanup completed');
    } catch (error) {
      this.logger.error('Failed to cleanup task scheduler:', error);
    }
  }

  private initializeSystemMonitor() {
    this.systemMonitorJob = new CronJob(
      '* * * * *', // 每分钟执行一次
      () => {
        this.logSystemMetrics();
      },
      null,
      false,
      this.timezone
    );

    this.systemMonitorJob.start();
    this.logger.log('System monitor task started');
  }

  private logSystemMetrics() {
    try {
      // 获取内存使用情况
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      const memoryUsage = (usedMem / totalMem * 100).toFixed(2);

      // 获取 CPU 使用情况
      const cpus = os.cpus();
      const cpuUsage = cpus.map(cpu => {
        const total = Object.values(cpu.times).reduce((acc, tv) => acc + tv, 0);
        const idle = cpu.times.idle;
        return ((total - idle) / total * 100).toFixed(2);
      });

      // 获取系统负载
      const loadAvg = os.loadavg();

      this.logger.log('\n=== System Metrics ===');
      this.logger.log(`Memory Usage: ${memoryUsage}% (${this.formatBytes(usedMem)} / ${this.formatBytes(totalMem)})`);
      this.logger.log(`CPU Usage: ${cpuUsage.join('%, ')}%`);
      this.logger.log(`System Load: ${loadAvg.join(', ')}`);
      this.logger.log('=====================\n');
    } catch (error) {
      this.logger.error('Failed to get system metrics:', error);
    }
  }

  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  private async loadCronTasks() {
    const tasks = await this.taskRepo.find({
      where: {
        type: TaskType.CRON,
        status: TaskStatus.PENDING
      }
    });

    this.logger.log(`Found ${tasks.length} pending cron tasks`);
    for (const task of tasks) {
      await this.scheduleTask(task);
    }
  }

  async scheduleTask(task: Task): Promise<void> {
    if (task.type !== TaskType.CRON) {
      return;
    }

    const params = typeof task.params === 'string' ? JSON.parse(task.params) : task.params;
    if (!params.crontab) {
      this.logger.warn(`Task ${task.id} has no crontab expression`);
      return;
    }

    // 移除已存在的任务（如果存在）
    try {
      this.schedulerRegistry.deleteCronJob(task.id);
      this.logger.log(`Removed existing job for task ${task.id}`);
    } catch (e) {
      // 忽略不存在的任务
    }

    // 创建新的定时任务，指定时区
    const job = new CronJob(
      params.crontab,
      () => {
        this.executeTask(task).catch(error => {
          this.logger.error(`Failed to execute task ${task.id}:`, error);
        });
      },
      null,
      false, // 不立即启动
      this.timezone // 指定时区
    );

    this.schedulerRegistry.addCronJob(task.id, job);
    job.start();

    this.logger.log(`Scheduled task ${task.id} with crontab: ${params.crontab}`);
    
    // 在 macOS 上，记录下一次执行时间
    if (this.platform === 'darwin') {
      const nextDate = job.nextDate();
      this.logger.log(`Next execution for task ${task.id} will be at: ${nextDate.toLocaleString()}`);
    }
  }

  async unscheduleTask(taskId: string): Promise<void> {
    try {
      const job = this.schedulerRegistry.getCronJob(taskId);
      if (job) {
        job.stop();
        this.schedulerRegistry.deleteCronJob(taskId);
        this.logger.log(`Unscheduled task ${taskId}`);
      }
    } catch (e) {
      this.logger.warn(`No job found for task ${taskId}`);
    }
  }

  private async executeTask(task: Task) {
    const startTime = Date.now();
    this.logger.log(`Starting execution of task ${task.id}: ${task.name}`);

    try {
      // 更新任务状态为进行中
      await this.taskRepo.update(task.id, {
        status: TaskStatus.IN_PROGRESS
      });

      // TODO: 执行具体的任务逻辑
      this.logger.log(`Executing task ${task.id}: ${task.name}`);

      // 更新任务状态为已完成
      await this.taskRepo.update(task.id, {
        status: TaskStatus.COMPLETED
      });

      const duration = Date.now() - startTime;
      this.logger.log(`Task ${task.id} completed in ${duration}ms`);
    } catch (e) {
      this.logger.error(`Failed to execute task ${task.id}:`, e);
      // 更新任务状态为已取消
      await this.taskRepo.update(task.id, {
        status: TaskStatus.CANCELLED
      });
    }
  }
} 