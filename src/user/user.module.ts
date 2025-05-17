import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { WalletModule } from '../wallet/wallet.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    WalletModule,
    StorageModule
  ],
  providers: [UserService, AuthService],
  controllers: [UserController, AuthController],
  exports: [UserService, AuthService],
})
export class UserModule {}
