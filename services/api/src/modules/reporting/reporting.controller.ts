import { Controller, Get, Post, Body, Query, Req, Ip, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { ReportingService } from './reporting.service';
import { ReportQueryDto, ExportDto } from './dto/reporting.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../identity/entities/user.entity';

@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReportingController {
  constructor(private svc: ReportingService) {}

  @Get('coverage')
  @RequirePermissions('report.read', 'dashboard.read')
  coverage(@CurrentUser() actor: User, @Query() q: ReportQueryDto) {
    return this.svc.coverage(actor, q);
  }

  @Get('activity')
  @RequirePermissions('report.read', 'dashboard.read')
  activity(@CurrentUser() actor: User, @Query() q: ReportQueryDto) {
    return this.svc.activity(actor, q);
  }

  @Get('stock')
  @RequirePermissions('report.read', 'dashboard.read')
  stock(@CurrentUser() actor: User, @Query() q: ReportQueryDto) {
    return this.svc.stock(actor, q);
  }

  @Get('cold-chain')
  @RequirePermissions('report.read', 'dashboard.read')
  coldChain(@CurrentUser() actor: User, @Query() q: ReportQueryDto) {
    return this.svc.coldChain(actor, q);
  }

  @Get('campaigns')
  @RequirePermissions('report.read', 'dashboard.read')
  campaigns(@CurrentUser() actor: User) {
    return this.svc.campaignsReport(actor);
  }

  @Post('exports')
  @RequirePermissions('export.create')
  export(@CurrentUser() actor: User, @Body() dto: ExportDto, @Ip() ip: string, @Req() req: Request) {
    return this.svc.export(actor, dto, ip, req.headers['user-agent']);
  }

  @Get('exports')
  @RequirePermissions('export.create', 'report.read')
  exports(@CurrentUser() actor: User) {
    return this.svc.listExports(actor);
  }
}
