import { Module } from '@nestjs/common';
import { LlmModule } from './llm/llm.module';
import { StorageModule } from './storage/storage.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user/user.entity';
import { Note } from './note/note.entity';
import { Wallet } from './wallet/wallet.entity';
import { Storage } from './storage/storage.entity'
import { LlmProvider } from './llm/llm-provider.entity'
import { LlmModel } from './llm/llm-model.entity';
import { UserModule } from './user/user.module';
import { NoteModule } from './note/note.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Relay } from './relay/relay.entity';
import { Reply } from './reply/reply.entity';
import { RelayModule } from './relay/relay.module';
import { ReplyModule } from './reply/reply.module';
import { Knowledgebase } from './knowledgebase/knowledgebase.entity';
import { Knowledgefile } from './knowledgebase/knowledgefile.entity';
import { KnowledgebaseModule } from './knowledgebase/knowledgebase.module';
import { CqrsModule } from '@nestjs/cqrs';
import { JoyhouseLoggerService } from './common/logger.service';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: async () => {
        const config = require('./common/joyhouse-config').JoyhouseConfigService.loadConfig();
        let type: any = config.dbType;
        if (type === 'postgresql') type = 'postgres';
        // 兼容 mysql
        if (type === 'mysql') type = 'mysql';
        const baseConfig = {
          type,
          entities: [User, Note, Wallet, Storage, LlmProvider, LlmModel, Relay, Reply, Knowledgebase, Knowledgefile],
          synchronize: true,
        };
        if (type === 'sqlite') {
          let dbFile = config.dbName;
          if (!dbFile) {
            const os = require('os');
            const path = require('path');
            let userDataDir = '';
            const platform = os.platform();
            if (platform === 'win32') {
              userDataDir = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
            } else if (platform === 'darwin') {
              userDataDir = path.join(os.homedir(), 'Library', 'Application Support');
            } else {
              userDataDir = process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share');
            }
            dbFile = path.join(userDataDir, 'joyhouse', 'joyhouse.db');
            // 确保目录存在
            const fs = require('fs');
            const dbDir = path.dirname(dbFile);
            if (!fs.existsSync(dbDir)) {
              fs.mkdirSync(dbDir, { recursive: true });
            }
          }
          return {
            ...baseConfig,
            database: dbFile,
          };
        } else if (type === 'postgres' || type === 'mysql') {
          return {
            ...baseConfig,
            host: config.dbHost,
            port: config.dbPort,
            username: config.dbUser,
            password: config.dbPassword,
            database: config.dbName,
          };
        } else {
          throw new Error('不支持的数据库类型: ' + config.dbType);
        }
      },
    }),
    CqrsModule,
    UserModule, 
    NoteModule, 
    RelayModule,
    StorageModule, 
    ReplyModule,
    LlmModule,
    KnowledgebaseModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
    JoyhouseLoggerService,
  ],
  exports: [JoyhouseLoggerService],
})
export class AppModule {}
