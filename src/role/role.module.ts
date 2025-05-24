import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from './role.entity';
import { UserRole } from './user-role.entity';
import { Permission } from './permission.entity';
import { RoleService } from './role.service';
import { RoleGuard } from './role.guard';
import { RoleController } from './role.controller';
import { OperationLogModule } from '../audit/operation-log.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Role, UserRole, Permission]),
    OperationLogModule,
  ],
  controllers: [RoleController],
  providers: [RoleService, RoleGuard],
  exports: [RoleService, RoleGuard],
})
export class RoleModule {}
