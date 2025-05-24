import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskGroup } from './task-group.entity';
import { TaskItem } from './task-item.entity';
import { Task } from './task.entity';
import { TaskGroupService } from './task-group.service';
import { TaskItemService } from './task-item.service';
import { TaskService } from './task.service';
import { TaskSchedulerService } from './task-scheduler.service';
import { UserTaskService } from './user-task.service';
import { TaskGroupController } from './task-group.controller';
import { TaskItemController } from './task-item.controller';
import { TaskController } from './task.controller';
import { UserTaskController } from './user-task.controller';
import { ScheduleModule } from '@nestjs/schedule';
import { RewardModule } from '../reward/reward.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TaskGroup, TaskItem, Task]),
    ScheduleModule.forRoot(),
    RewardModule,
  ],
  controllers: [
    TaskGroupController,
    TaskItemController,
    TaskController,
    UserTaskController,
  ],
  providers: [
    TaskGroupService,
    TaskItemService,
    TaskService,
    TaskSchedulerService,
    UserTaskService,
  ],
  exports: [
    TaskGroupService,
    TaskItemService,
    TaskService,
    TaskSchedulerService,
    UserTaskService,
  ],
})
export class TaskModule {}
