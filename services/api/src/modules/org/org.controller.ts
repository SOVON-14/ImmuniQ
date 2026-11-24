import {
  Body, Controller, Get, Ip, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { OrgService } from './org.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TerritoryLevel } from './entities/territory.entity';
import { StructureStatus, StructureType } from './entities/structure.entity';
import { User } from '../identity/entities/user.entity';

@Controller('org')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OrgController {
  constructor(private org: OrgService) {}

  // Territoires
  @Get('territories')
  @RequirePermissions('territory.read')
  territories(@Query('level') level?: TerritoryLevel) {
    return this.org.listTerritories(level);
  }

  @Post('territories')
  @RequirePermissions('structure.create') // droits d'administration territoriale
  createTerritory(@Body() dto: { level: TerritoryLevel; code: string; name: string; parentId?: string }) {
    return this.org.createTerritory(dto);
  }

  @Patch('territories/:id/status')
  @RequirePermissions('structure.update')
  territoryStatus(@Param('id', ParseUUIDPipe) id: string, @Body() body: { status: string }) {
    return this.org.updateTerritoryStatus(id, body.status);
  }

  // Structures
  @Get('structures')
  @RequirePermissions('structure.read')
  structures(@CurrentUser() actor: User, @Query('territoryId') territoryId?: string, @Query('type') type?: StructureType) {
    return this.org.listStructures(actor, territoryId, type);
  }

  @Post('structures')
  @RequirePermissions('structure.create')
  createStructure(@CurrentUser() actor: User, @Body() dto: any, @Ip() ip: string, @Req() req: Request) {
    return this.org.createStructure(actor, dto, ip, req.headers['user-agent']);
  }

  @Patch('structures/:id')
  @RequirePermissions('structure.update')
  updateStructure(@Param('id', ParseUUIDPipe) id: string, @Body() dto: any) {
    return this.org.updateStructure(id, dto);
  }

  @Patch('structures/:id/status')
  @RequirePermissions('structure.update')
  structureStatus(@Param('id', ParseUUIDPipe) id: string, @Body() body: { status: StructureStatus }) {
    return this.org.setStructureStatus(id, body.status);
  }

  // Équipes mobiles
  @Get('teams')
  @RequirePermissions('structure.read')
  teams(@Query('structureId') structureId?: string) {
    return this.org.listTeams(structureId);
  }

  @Post('teams')
  @RequirePermissions('assignment.manage')
  createTeam(@CurrentUser() actor: User, @Body() dto: any, @Ip() ip: string, @Req() req: Request) {
    return this.org.createTeam(actor, dto, ip, req.headers['user-agent']);
  }

  @Patch('teams/:id')
  @RequirePermissions('assignment.manage')
  updateTeam(@Param('id', ParseUUIDPipe) id: string, @Body() dto: any) {
    return this.org.updateTeam(id, dto);
  }
}
