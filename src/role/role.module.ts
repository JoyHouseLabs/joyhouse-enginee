import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from './role.entity';
import { Permission } from './permission.entity';
import { UserRole } from './user-role.entity';
import { RoleService } from './role.service';
import { RoleController } from './role.controller';
import { AuditModule } from '../audit/audit.module';

// 新增的企业级实体
import { Organization, UserOrganization, OrganizationDataPermission } from './organization.entity';
import { AuditLog, DataAccessLog, SystemOperationLog } from './audit-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      // 原有实体
      Role,
      Permission,
      UserRole,
      
      // 企业级组织实体
      Organization,
      UserOrganization,
      OrganizationDataPermission,
      
      // 审计和合规实体
      AuditLog,
      DataAccessLog,
      SystemOperationLog,
    ]),
    forwardRef(() => AuditModule),
  ],
  providers: [RoleService],
  controllers: [RoleController],
  exports: [RoleService, TypeOrmModule],
})
export class RoleModule {}
