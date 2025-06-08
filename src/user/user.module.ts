import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { AdminController } from './admin.controller';
import { JailUser } from './jail-user.entity';
import { WalletModule } from '../wallet/wallet.module';
import { StorageModule } from '../storage/storage.module';
import { AuthModule } from '../auth/auth.module';
import { AgentModule } from '../agent/agent.module';
import { UserSettings } from './user-settings.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, JailUser, UserSettings]),
    WalletModule,
    forwardRef(() => StorageModule),
    forwardRef(() => AuthModule),
    forwardRef(() => AgentModule),
  ],
  providers: [UserService],
  controllers: [UserController, AdminController],
  exports: [UserService],
})
export class UserModule {}
