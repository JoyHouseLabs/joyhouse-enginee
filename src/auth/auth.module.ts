import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { User } from '../user/user.entity';
import { StorageDir } from '../storage/storage-dir.entity';
import { TokenBlacklist } from './entities/token-blacklist.entity';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { WalletModule } from '../wallet/wallet.module';
import { StorageModule } from '../storage/storage.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, StorageDir, TokenBlacklist]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'joyhouse-secret',
      signOptions: { expiresIn: '7d' },
    }),
    WalletModule,
    StorageModule,
    forwardRef(() => UserModule),
  ],
  providers: [AuthService, LocalStrategy, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
