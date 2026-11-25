import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { Lot } from './entities/lot.entity';
import { StockLevel } from './entities/stock-level.entity';
import { StockMovement } from './entities/stock-movement.entity';
import { Inventory } from './entities/inventory.entity';
import { InventoryLine } from './entities/inventory-line.entity';
import { User } from '../identity/entities/user.entity';
import { AuditLog } from '../identity/entities/audit-log.entity';
import { Assignment } from '../identity/entities/assignment.entity';
import { LogisticsService } from './logistics.service';
import { LogisticsController } from './logistics.controller';
import { AuditService } from '../../common/audit/audit.service';
import { ScopeService } from '../../common/scope/scope.service';

@Module({
  imports: [TypeOrmModule.forFeature([
    Product, Lot, StockLevel, StockMovement, Inventory, InventoryLine,
    User, AuditLog, Assignment,
  ])],
  controllers: [LogisticsController],
  providers: [LogisticsService, AuditService, ScopeService],
  exports: [LogisticsService],
})
export class LogisticsModule {}
