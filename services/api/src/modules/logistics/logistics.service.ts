import {
  BadRequestException, ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { Lot, LotStatus } from './entities/lot.entity';
import { StockLevel } from './entities/stock-level.entity';
import { StockMovement, MovementType } from './entities/stock-movement.entity';
import { Inventory, InventoryStatus } from './entities/inventory.entity';
import { InventoryLine } from './entities/inventory-line.entity';
import {
  CreateProductDto, ReceiveLotDto, TransferDto, AdjustDto, MovementDto, CountLineDto,
} from './dto/logistics.dto';
import { User } from '../identity/entities/user.entity';
import { RoleCode } from '../identity/entities/role.entity';
import { AuditService } from '../../common/audit/audit.service';
import { ScopeService } from '../../common/scope/scope.service';

/**
 * M08 — Logistique et stocks.
 * Invariants :
 * - stock_levels.quantity_on_hand >= 0 toujours ;
 * - stock_movements est append-only (jamais d'UPDATE/DELETE) ;
 * - un lot expired/quarantined n'est plus dispensable ;
 * - tout mouvement exige un motif et est audité.
 */
@Injectable()
export class LogisticsService {
  constructor(
    @InjectRepository(Product) private products: Repository<Product>,
    @InjectRepository(Lot) private lots: Repository<Lot>,
    @InjectRepository(StockLevel) private levels: Repository<StockLevel>,
    @InjectRepository(StockMovement) private movements: Repository<StockMovement>,
    @InjectRepository(Inventory) private inventories: Repository<Inventory>,
    @InjectRepository(InventoryLine) private invLines: Repository<InventoryLine>,
    private audit: AuditService,
    private scope: ScopeService,
    private dataSource: DataSource,
  ) {}

  // ---------- Produits ----------

  async listProducts(activeOnly = true) {
    return this.products.find({
      where: activeOnly ? { active: true } : {},
      order: { name: 'ASC' },
    });
  }

  async createProduct(actor: User, dto: CreateProductDto, ip?: string, ua?: string) {
    const exists = await this.products.findOne({ where: { code: dto.code.toUpperCase() } });
    if (exists) throw new BadRequestException('Code produit déjà utilisé');
    const p = await this.products.save(this.products.create({ ...dto, code: dto.code.toUpperCase() }));
    await this.audit.log({ actorId: actor.id, action: 'product.create', resourceType: 'product', resourceId: p.id, ip, userAgent: ua });
    return p;
  }

  // ---------- Lots & réceptions ----------

  async receiveLot(actor: User, dto: ReceiveLotDto, ip?: string, ua?: string) {
    await this.assertStructureWrite(actor, dto.structureId);
    const product = await this.products.findOne({ where: { id: dto.productId } });
    if (!product) throw new NotFoundException('Produit introuvable');
    if (!product.active) throw new BadRequestException('Produit inactif');

    const expiry = new Date(dto.expiryDate);
    const receipt = dto.receiptDate ? new Date(dto.receiptDate) : new Date();
    if (expiry <= receipt) throw new BadRequestException('Date d’expiration invalide');

    // Transaction : lot + niveau + mouvement réception — tout ou rien
    const lot = await this.dataSource.transaction(async (em) => {
      const savedLot = await em.getRepository(Lot).save(em.getRepository(Lot).create({
        productId: dto.productId,
        lotNumber: dto.lotNumber,
        expiryDate: expiry,
        receiptDate: receipt,
        quantityInitial: dto.quantityInitial,
        manufacturer: dto.manufacturer,
        supplier: dto.supplier,
        structureId: dto.structureId,
        status: dto.status ?? LotStatus.AVAILABLE,
        notes: dto.notes,
      }));
      await this.upsertLevelTx(em, savedLot.id, dto.structureId, dto.quantityInitial);
      await em.getRepository(StockMovement).save(em.getRepository(StockMovement).create({
        lotId: savedLot.id, productId: dto.productId,
        toStructureId: dto.structureId, quantity: dto.quantityInitial,
        type: MovementType.RECEIPT, reason: `Réception lot ${dto.lotNumber} (${dto.supplier ?? 'fournisseur non précisé'})`,
        actorId: actor.id,
      }));
      return savedLot;
    });
    await this.audit.log({
      actorId: actor.id, action: 'stock.receive', resourceType: 'lot', resourceId: lot.id,
      ip, userAgent: ua, details: { lotNumber: dto.lotNumber, quantity: dto.quantityInitial, structureId: dto.structureId },
    });
    return lot;
  }

  async listLots(actor: User, structureId?: string, status?: LotStatus) {
    const qb = this.lots.createQueryBuilder('l')
      .leftJoinAndSelect('l.product', 'p')
      .leftJoinAndSelect('l.levels', 'lv')
      .orderBy('l.created_at', 'DESC');
    if (structureId) qb.andWhere('lv.structure_id = :sid', { sid: structureId });
    if (status) qb.andWhere('l.status = :st', { st: status });
    const rows = await qb.getMany();
    return this.filterByScope(actor, rows, (l) => l.structureId);
  }

  async getLot(actor: User, id: string) {
    const lot = await this.lots.findOne({
      where: { id },
      relations: ['product', 'structure', 'levels', 'levels.structure'],
    });
    if (!lot) throw new NotFoundException('Lot introuvable');
    await this.assertLotAccess(actor, lot);
    return lot;
  }

  // ---------- Mouvements ----------

  /** Transfert inter-structures : sortie + entrée, stock jamais négatif. */
  async transfer(actor: User, dto: TransferDto, ip?: string, ua?: string) {
    if (dto.fromStructureId === dto.toStructureId) throw new BadRequestException('Source et destination identiques');
    await this.assertStructureWrite(actor, dto.fromStructureId);
    await this.assertStructureWrite(actor, dto.toStructureId);
    const lot = await this.getLotForWrite(actor, dto.lotId);
    this.assertLotDispensable(lot);

    const from = await this.getLevel(dto.lotId, dto.fromStructureId);
    if (!from || from.quantityOnHand < dto.quantity) {
      throw new BadRequestException(`Stock insuffisant (disponible : ${from?.quantityOnHand ?? 0})`);
    }

    // Transaction : débit source + crédit destination + 2 mouvements
    await this.dataSource.transaction(async (em) => {
      await this.applyLevelDeltaTx(em, dto.lotId, dto.fromStructureId, -dto.quantity);
      await this.upsertLevelTx(em, dto.lotId, dto.toStructureId, dto.quantity);
      const base = { lotId: lot.id, productId: lot.productId, reason: dto.reason, actorId: actor.id };
      const mvRepo = em.getRepository(StockMovement);
      await mvRepo.save([
        mvRepo.create({ ...base, fromStructureId: dto.fromStructureId, quantity: -dto.quantity, type: MovementType.TRANSFER_OUT }),
        mvRepo.create({ ...base, toStructureId: dto.toStructureId, quantity: dto.quantity, type: MovementType.TRANSFER_IN }),
      ]);
    });
    await this.audit.log({
      actorId: actor.id, action: 'stock.transfer', resourceType: 'lot', resourceId: lot.id,
      ip, userAgent: ua, details: { from: dto.fromStructureId, to: dto.toStructureId, quantity: dto.quantity, reason: dto.reason },
    });
    return { lotId: lot.id, transferred: dto.quantity };
  }

  /** Perte, retour, quarantaine, libération — motif obligatoire. */
  async recordMovement(actor: User, dto: MovementDto, ip?: string, ua?: string) {
    await this.assertStructureWrite(actor, dto.structureId);
    const lot = await this.getLotForWrite(actor, dto.lotId);

    const level = await this.getLevel(dto.lotId, dto.structureId);
    const available = level?.quantityOnHand ?? 0;
    const isInflux = dto.type === MovementType.RELEASE; // libération de quarantaine : pas de sortie de stock
    const delta = isInflux ? 0 : -dto.quantity;

    if (!isInflux) {
      if (dto.type === MovementType.QUARANTINE) this.assertLotDispensable(lot);
      if (available < dto.quantity) {
        throw new BadRequestException(`Stock insuffisant (disponible : ${available})`);
      }
    }

    // Transaction : niveau + statut lot + mouvement
    const movement = await this.dataSource.transaction(async (em) => {
      if (!isInflux) {
        await this.applyLevelDeltaTx(em, dto.lotId, dto.structureId, delta);
      }
      if (dto.type === MovementType.QUARANTINE) {
        lot.status = LotStatus.QUARANTINED;
        await em.getRepository(Lot).save(lot);
      } else if (dto.type === MovementType.RELEASE) {
        if (lot.status !== LotStatus.QUARANTINED) throw new BadRequestException('Le lot n’est pas en quarantaine');
        if (new Date(lot.expiryDate) <= new Date()) throw new BadRequestException('Lot expiré : libération impossible');
        lot.status = LotStatus.AVAILABLE;
        await em.getRepository(Lot).save(lot);
      }
      return em.getRepository(StockMovement).save(em.getRepository(StockMovement).create({
        lotId: lot.id, productId: lot.productId,
        fromStructureId: dto.structureId, quantity: delta,
        type: dto.type, reason: dto.reason, actorId: actor.id,
      }));
    });
    await this.audit.log({
      actorId: actor.id, action: `stock.${dto.type}`, resourceType: 'stock_movement', resourceId: movement.id,
      ip, userAgent: ua, details: { lotId: lot.id, structureId: dto.structureId, quantity: dto.quantity, reason: dto.reason },
    });
    return movement;
  }

  /** Ajustement d'inventaire : fixe la quantité théorique (delta signé). */
  async adjust(actor: User, dto: AdjustDto, ip?: string, ua?: string) {
    await this.assertStructureWrite(actor, dto.structureId);
    const lot = await this.getLotForWrite(actor, dto.lotId);
    if (dto.newQuantity < 0) throw new BadRequestException('Quantité invalide');

    const level = await this.getLevel(dto.lotId, dto.structureId);
    const current = level?.quantityOnHand ?? 0;
    const delta = dto.newQuantity - current;
    if (delta === 0) return { lotId: lot.id, structureId: dto.structureId, unchanged: true };
    if (current + delta < 0) throw new BadRequestException('Ajustement impossible : quantité négative');

    // Transaction : niveau + mouvement d'ajustement
    const movement = await this.dataSource.transaction(async (em) => {
      await this.applyLevelDeltaTx(em, dto.lotId, dto.structureId, delta);
      return em.getRepository(StockMovement).save(em.getRepository(StockMovement).create({
        lotId: lot.id, productId: lot.productId,
        fromStructureId: dto.structureId, quantity: delta,
        type: MovementType.ADJUSTMENT, reason: dto.reason,
        referenceType: 'inventory', actorId: actor.id,
      }));
    });
    await this.audit.log({
      actorId: actor.id, action: 'stock.adjust', resourceType: 'stock_movement', resourceId: movement.id,
      ip, userAgent: ua, details: { lotId: lot.id, structureId: dto.structureId, from: current, to: dto.newQuantity, reason: dto.reason },
    });
    return { lotId: lot.id, structureId: dto.structureId, previous: current, new: dto.newQuantity };
  }

  async listMovements(actor: User, structureId?: string, lotId?: string) {
    const qb = this.movements.createQueryBuilder('m')
      .leftJoinAndSelect('m.lot', 'l')
      .leftJoinAndSelect('l.product', 'p')
      .leftJoinAndSelect('m.actor', 'u')
      .orderBy('m.created_at', 'DESC')
      .take(500);
    if (structureId) qb.andWhere('(m.from_structure_id = :sid OR m.to_structure_id = :sid)', { sid: structureId });
    if (lotId) qb.andWhere('m.lot_id = :lid', { lid: lotId });
    const rows = await qb.getMany();
    if ([RoleCode.NATIONAL_ADMIN, RoleCode.HEALTH_AUTHORITY].includes(actor.role?.code as RoleCode)) return rows;
    const sids = await this.scope.structureIdsFor(actor.id);
    return rows.filter((m) =>
      (m.fromStructureId && sids.includes(m.fromStructureId)) ||
      (m.toStructureId && sids.includes(m.toStructureId)));
  }

  async getLevels(actor: User, structureId?: string) {
    const qb = this.levels.createQueryBuilder('s')
      .leftJoinAndSelect('s.lot', 'l')
      .leftJoinAndSelect('l.product', 'p')
      .leftJoinAndSelect('s.structure', 'st');
    if (structureId) qb.where('s.structure_id = :sid', { sid: structureId });
    const rows = await qb.getMany();
    if ([RoleCode.NATIONAL_ADMIN, RoleCode.HEALTH_AUTHORITY].includes(actor.role?.code as RoleCode)) return rows;
    const sids = await this.scope.structureIdsFor(actor.id);
    return rows.filter((r) => sids.includes(r.structureId));
  }

  // ---------- Inventaires ----------

  async openInventory(actor: User, structureId: string, ip?: string, ua?: string) {
    await this.assertStructureWrite(actor, structureId);
    const existing = await this.inventories.findOne({ where: { structureId, status: InventoryStatus.OPEN } });
    if (existing) throw new BadRequestException('Un inventaire est déjà ouvert pour cette structure');

    const inv = await this.inventories.save(this.inventories.create({
      structureId, status: InventoryStatus.OPEN, openedBy: actor.id, openedAt: new Date(),
    }));

    // Pré-remplit les lignes avec le stock théorique de chaque lot présent
    const levels = await this.levels.find({ where: { structureId } });
    for (const lv of levels.filter((l) => l.quantityOnHand > 0)) {
      await this.invLines.save(this.invLines.create({
        inventoryId: inv.id, lotId: lv.lotId, expectedQty: lv.quantityOnHand,
      }));
    }
    await this.audit.log({ actorId: actor.id, action: 'inventory.open', resourceType: 'inventory', resourceId: inv.id, ip, userAgent: ua });
    return this.inventories.findOne({ where: { id: inv.id }, relations: ['lines', 'lines.lot', 'lines.lot.product'] });
  }

  async countLine(actor: User, inventoryId: string, dto: CountLineDto) {
    const inv = await this.getOpenInventory(actor, inventoryId);
    let line = await this.invLines.findOne({ where: { inventoryId, lotId: dto.lotId } });
    if (!line) {
      const level = await this.getLevel(dto.lotId, inv.structureId);
      line = this.invLines.create({
        inventoryId, lotId: dto.lotId,
        expectedQty: level?.quantityOnHand ?? 0,
      });
    }
    line.countedQty = dto.countedQty;
    return this.invLines.save(line);
  }

  async closeInventory(actor: User, inventoryId: string, ip?: string, ua?: string) {
    const inv = await this.getOpenInventory(actor, inventoryId);
    const lines = await this.invLines.find({ where: { inventoryId } });
    for (const l of lines) {
      if (l.countedQty == null) throw new BadRequestException(`Lot ${l.lotId} non compté`);
      l.variance = l.countedQty - l.expectedQty;
      await this.invLines.save(l);
    }
    inv.status = InventoryStatus.CLOSED;
    inv.closedBy = actor.id;
    inv.closedAt = new Date();
    const saved = await this.inventories.save(inv);
    await this.audit.log({
      actorId: actor.id, action: 'inventory.close', resourceType: 'inventory', resourceId: inventoryId,
      ip, userAgent: ua,
      details: { lines: lines.length, variances: lines.filter((l) => l.variance !== 0).length },
    });
    return saved;
  }

  async listInventories(actor: User, structureId?: string) {
    const qb = this.inventories.createQueryBuilder('i')
      .leftJoinAndSelect('i.lines', 'l')
      .leftJoinAndSelect('l.lot', 'lot')
      .leftJoinAndSelect('lot.product', 'p')
      .orderBy('i.opened_at', 'DESC');
    if (structureId) qb.where('i.structure_id = :sid', { sid: structureId });
    const rows = await qb.getMany();
    if ([RoleCode.NATIONAL_ADMIN, RoleCode.HEALTH_AUTHORITY].includes(actor.role?.code as RoleCode)) return rows;
    const sids = await this.scope.structureIdsFor(actor.id);
    return rows.filter((i) => sids.includes(i.structureId));
  }

  // ---------- Helpers ----------

  private async getLevel(lotId: string, structureId: string) {
    return this.levels.findOne({ where: { lotId, structureId } });
  }

  // Variantes transactionnelles (EntityManager)
  private async upsertLevelTx(em: EntityManager, lotId: string, structureId: string, qty: number) {
    const repo = em.getRepository(StockLevel);
    let level = await repo.findOne({ where: { lotId, structureId } });
    if (!level) level = repo.create({ lotId, structureId, quantityOnHand: 0, updatedAt: new Date() });
    level.quantityOnHand += qty;
    level.updatedAt = new Date();
    return repo.save(level);
  }

  private async applyLevelDeltaTx(em: EntityManager, lotId: string, structureId: string, delta: number) {
    const repo = em.getRepository(StockLevel);
    const level = await repo.findOne({ where: { lotId, structureId } });
    if (!level) throw new NotFoundException('Niveau de stock introuvable');
    const next = level.quantityOnHand + delta;
    if (next < 0) throw new BadRequestException('Stock insuffisant');
    level.quantityOnHand = next;
    level.updatedAt = new Date();
    return repo.save(level);
  }

  private async getLotForWrite(actor: User, lotId: string) {
    const lot = await this.lots.findOne({ where: { id: lotId } });
    if (!lot) throw new NotFoundException('Lot introuvable');
    await this.assertLotAccess(actor, lot);
    return lot;
  }

  private assertLotDispensable(lot: Lot) {
    if (lot.status === LotStatus.QUARANTINED) throw new BadRequestException('Lot en quarantaine');
    if (lot.status === LotStatus.DEPLETED) throw new BadRequestException('Lot épuisé');
    if (lot.status === LotStatus.EXPIRED || new Date(lot.expiryDate) <= new Date()) {
      throw new BadRequestException('Lot expiré');
    }
  }

  private async getOpenInventory(actor: User, inventoryId: string) {
    const inv = await this.inventories.findOne({ where: { id: inventoryId } });
    if (!inv) throw new NotFoundException('Inventaire introuvable');
    if (inv.status !== InventoryStatus.OPEN) throw new BadRequestException('Inventaire clôturé');
    await this.assertStructureWrite(actor, inv.structureId);
    return inv;
  }

  private async assertStructureWrite(actor: User, structureId: string) {
    if ([RoleCode.NATIONAL_ADMIN, RoleCode.HEALTH_AUTHORITY].includes(actor.role?.code as RoleCode)) return;
    const ok = await this.scope.canAccessStructure(actor, structureId);
    if (!ok) throw new ForbiddenException('Structure hors de votre périmètre');
  }

  private async assertLotAccess(actor: User, lot: Lot) {
    if (!lot.structureId) return; // lot sans structure : accès libre en lecture
    if ([RoleCode.NATIONAL_ADMIN, RoleCode.HEALTH_AUTHORITY].includes(actor.role?.code as RoleCode)) return;
    const sids = await this.scope.structureIdsFor(actor.id);
    // accès si le lot a du stock dans une structure du périmètre
    const levels = await this.levels.find({ where: { lotId: lot.id } });
    if (levels.some((l) => sids.includes(l.structureId)) || sids.includes(lot.structureId)) return;
    throw new ForbiddenException('Lot hors de votre périmètre');
  }

  private async filterByScope<T>(actor: User, rows: T[], getSid: (r: T) => string | null | undefined): Promise<T[]> {
    if ([RoleCode.NATIONAL_ADMIN, RoleCode.HEALTH_AUTHORITY].includes(actor.role?.code as RoleCode)) return rows;
    const sids = await this.scope.structureIdsFor(actor.id);
    return rows.filter((r) => {
      const sid = getSid(r);
      return !sid || sids.includes(sid);
    });
  }
}
