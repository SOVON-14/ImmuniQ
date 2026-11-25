import {
  Body, Controller, Get, Ip, Param, ParseUUIDPipe, Post, Query, Req, UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { LogisticsService } from './logistics.service';
import {
  CreateProductDto, ReceiveLotDto, TransferDto, AdjustDto, MovementDto, CountLineDto,
} from './dto/logistics.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../identity/entities/user.entity';
import { LotStatus } from './entities/lot.entity';

@Controller('stock')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LogisticsController {
  constructor(private svc: LogisticsService) {}

  // ---- Produits ----
  @Get('products')
  @RequirePermissions('stock.read')
  products(@Query('all') all?: string) {
    return this.svc.listProducts(all !== 'true');
  }

  @Post('products')
  @RequirePermissions('stock.receive', 'stock.move')
  createProduct(@CurrentUser() actor: User, @Body() dto: CreateProductDto, @Ip() ip: string, @Req() req: Request) {
    return this.svc.createProduct(actor, dto, ip, req.headers['user-agent']);
  }

  // ---- Lots ----
  @Get('lots')
  @RequirePermissions('stock.read')
  lots(@CurrentUser() actor: User, @Query('structureId') structureId?: string, @Query('status') status?: LotStatus) {
    return this.svc.listLots(actor, structureId, status);
  }

  @Get('lots/:id')
  @RequirePermissions('stock.read')
  lot(@CurrentUser() actor: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.getLot(actor, id);
  }

  @Post('lots/receive')
  @RequirePermissions('stock.receive')
  receive(@CurrentUser() actor: User, @Body() dto: ReceiveLotDto, @Ip() ip: string, @Req() req: Request) {
    return this.svc.receiveLot(actor, dto, ip, req.headers['user-agent']);
  }

  // ---- Mouvements ----
  @Post('transfers')
  @RequirePermissions('stock.move')
  transfer(@CurrentUser() actor: User, @Body() dto: TransferDto, @Ip() ip: string, @Req() req: Request) {
    return this.svc.transfer(actor, dto, ip, req.headers['user-agent']);
  }

  @Post('movements')
  @RequirePermissions('stock.move', 'stock.adjust')
  movement(@CurrentUser() actor: User, @Body() dto: MovementDto, @Ip() ip: string, @Req() req: Request) {
    return this.svc.recordMovement(actor, dto, ip, req.headers['user-agent']);
  }

  @Post('adjustments')
  @RequirePermissions('stock.adjust')
  adjust(@CurrentUser() actor: User, @Body() dto: AdjustDto, @Ip() ip: string, @Req() req: Request) {
    return this.svc.adjust(actor, dto, ip, req.headers['user-agent']);
  }

  @Get('movements')
  @RequirePermissions('stock.read')
  movements(@CurrentUser() actor: User, @Query('structureId') structureId?: string, @Query('lotId') lotId?: string) {
    return this.svc.listMovements(actor, structureId, lotId);
  }

  // ---- Niveaux de stock ----
  @Get('levels')
  @RequirePermissions('stock.read')
  levels(@CurrentUser() actor: User, @Query('structureId') structureId?: string) {
    return this.svc.getLevels(actor, structureId);
  }

  // ---- Inventaires ----
  @Get('inventories')
  @RequirePermissions('stock.read')
  inventories(@CurrentUser() actor: User, @Query('structureId') structureId?: string) {
    return this.svc.listInventories(actor, structureId);
  }

  @Post('inventories')
  @RequirePermissions('inventory.manage')
  openInventory(@CurrentUser() actor: User, @Body() body: { structureId: string }, @Ip() ip: string, @Req() req: Request) {
    return this.svc.openInventory(actor, body.structureId, ip, req.headers['user-agent']);
  }

  @Post('inventories/:id/lines')
  @RequirePermissions('inventory.manage')
  countLine(@CurrentUser() actor: User, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CountLineDto) {
    return this.svc.countLine(actor, id, dto);
  }

  @Post('inventories/:id/close')
  @RequirePermissions('inventory.manage')
  closeInventory(@CurrentUser() actor: User, @Param('id', ParseUUIDPipe) id: string, @Ip() ip: string, @Req() req: Request) {
    return this.svc.closeInventory(actor, id, ip, req.headers['user-agent']);
  }
}
