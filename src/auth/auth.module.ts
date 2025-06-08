import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { User } from '../user/user.entity';
import { StorageDir } from '../storage/storage-dir.entity';
import { TokenBlacklist } from './entities/token-blacklist.entity';
import { LocalStrategy } from './guards/local.strategy';
import { JwtStrategy } from './guards/jwt.strategy';
import { WalletModule } from '../wallet/wallet.module';
import { StorageModule } from '../storage/storage.module';
import { UserModule } from '../user/user.module';
import { AgentModule } from '../agent/agent.module';
import { AuditModule } from '../audit/audit.module';
import { Role } from '../role/role.entity';
import { Permission } from '../role/permission.entity';
import { UserRole } from '../role/user-role.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      StorageDir,
      TokenBlacklist,
      Role,
      Permission,
      UserRole
    ]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'joyhouse-secret',
      signOptions: { expiresIn: '7d' },
    }),
    forwardRef(() => WalletModule),
    forwardRef(() => StorageModule),
    forwardRef(() => UserModule),
    forwardRef(() => AgentModule),
    AuditModule,
  ],
  providers: [AuthService, LocalStrategy, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
