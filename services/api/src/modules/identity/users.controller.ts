import {
  Body, Controller, ForbiddenException, Get, Ip, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserStatusDto, AssignScopeDto } from './dto/users.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User, UserStatus } from './entities/user.entity';
import { RoleCode } from './entities/role.entity';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private users: UsersService) {}

  @Get()
  @RequirePermissions('account.read')
  list(@CurrentUser() actor: User, @Query('structureId') structureId?: string, @Query('status') status?: UserStatus, @Query('roleCode') roleCode?: RoleCode) {
    return this.users.list(actor, { structureId, status, roleCode });
  }

  @Post()
  @RequirePermissions('account.create')
  create(@CurrentUser() actor: User, @Body() dto: CreateUserDto, @Ip() ip: string, @Req() req: Request) {
    return this.users.create(actor, dto, ip, req.headers['user-agent']);
  }

  @Patch(':id/status')
  @RequirePermissions('account.suspend')
  updateStatus(@CurrentUser() actor: User, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserStatusDto, @Ip() ip: string, @Req() req: Request) {
    return this.users.updateStatus(actor, id, dto, ip, req.headers['user-agent']);
  }

  @Post(':id/assignments')
  @RequirePermissions('assignment.manage')
  assign(@CurrentUser() actor: User, @Param('id', ParseUUIDPipe) id: string, @Body() dto: AssignScopeDto, @Ip() ip: string, @Req() req: Request) {
    return this.users.assignScope(actor, id, dto, ip, req.headers['user-agent']);
  }

  @Get(':id/assignments')
  @RequirePermissions('account.read')
  assignments(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.listAssignments(id);
  }

  @Post(':id/mfa/setup')
  @RequirePermissions('account.read')
  setupMfa(@CurrentUser() actor: User, @Param('id', ParseUUIDPipe) id: string) {
    if (id !== actor.id && actor.role?.code !== RoleCode.NATIONAL_ADMIN) {
      throw new ForbiddenException('Vous ne pouvez configurer que votre propre MFA');
    }
    return this.users.setupMfa(id);
  }
}
