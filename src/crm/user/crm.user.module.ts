import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../user/user.entity';
import { JailUser } from '../../user/jail-user.entity';
import { CrmUserController } from './user.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, JailUser])],
  controllers: [CrmUserController],
})
export class CrmUserModule {}
