import { Module } from '@nestjs/common';
import { LlmModule } from './llm/llm.module';
import { StorageModule } from './storage/storage.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user/user.entity';
import { Note } from './note/note.entity';
import { Wallet } from './wallet/wallet.entity';
import { Storage } from './storage/storage.entity';
import { LlmProvider } from './llm/llm-provider.entity';
import { LlmModel } from './llm/llm-model.entity';
import { UserModule } from './user/user.module';
import { CrmUserModule } from './crm/user/crm.user.module';
import { NoteModule } from './note/note.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Relay } from './relay/relay.entity';
import { Reply } from './reply/reply.entity';
import { RelayModule } from './relay/relay.module';
import { ReplyModule } from './reply/reply.module';
import { Knowledgebase } from './knowledgebase/knowledgebase.entity';
import { Knowledgefile } from './knowledgebase/knowledgefile.entity';
import { StorageDir } from './storage/storage-dir.entity';
import { Permission } from './role/permission.entity';
import { UserRole } from './role/user-role.entity';
import { Role } from './role/role.entity';
import { RoleModule } from './role/role.module';
import { Meditation } from './meditation/meditation.entity';
import { JailUser } from './user/jail-user.entity';
import { Task } from './task/task.entity';
import { TaskGroup } from './task/task-group.entity';
import { TaskItem } from './task/task-item.entity';
import { TaskModule } from './task/task.module';
import { Reward } from './reward/reward.entity';
import { UserReward } from './reward/user-reward.entity';
import { RewardModule } from './reward/reward.module';
import { OperationLogModule } from './audit/operation-log.module';
import { KnowledgebaseModule } from './knowledgebase/knowledgebase.module';
import { CqrsModule } from '@nestjs/cqrs';
import { JoyhouseLoggerService } from './common/logger.service';
import { BrainModule } from './brain/brain.module';
import { MeditationModule } from './meditation/meditation.module';
import { OperationLog } from './audit/operation-log.entity';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { QuizModule } from './quiz/quiz.module';
import { AgentModule } from './agent/agent.module';
import { ToolModule } from './tool/tool.module';
import { WorkflowModule } from './workflow/workflow.module';
import { MultiAgentModule } from './multi-agent/multi-agent.module';
import { JoyhouseConfigService } from './common/joyhouse-config';
import { AppStoreModule } from './appstore/app.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const config = JoyhouseConfigService.loadConfig();
        if (config.dbType === 'postgresql') {
          return {
            type: 'postgres',
            host: config.dbHost,
            port: config.dbPort,
            username: config.dbUser,
            password: config.dbPassword,
            database: config.dbName,
            entities: [__dirname + '/**/*.entity{.ts,.js}'],
            synchronize: true,
          };
        } else {
          return {
            type: 'sqlite',
            database: configService.get('DATABASE_PATH', 'database.sqlite'),
            entities: [__dirname + '/**/*.entity{.ts,.js}'],
            synchronize: true,
          };
        }
      },
      inject: [ConfigService],
    }),
    CqrsModule,
    UserModule,
    NoteModule,
    RelayModule,
    StorageModule,
    ReplyModule,
    LlmModule,
    KnowledgebaseModule,
    MeditationModule,
    BrainModule,
    CrmUserModule,
    TaskModule,
    RewardModule,
    RoleModule,
    OperationLogModule,
    AuthModule,
    QuizModule,
    AgentModule,
    ToolModule,
    WorkflowModule,
    MultiAgentModule,
    AppStoreModule,
  ],
  controllers: [AppController],
  providers: [AppService, JoyhouseLoggerService],
  exports: [JoyhouseLoggerService],
})
export class AppModule {}
