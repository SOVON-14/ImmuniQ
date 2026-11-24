import {
  BadRequestException, Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, TreeRepository } from 'typeorm';
import { Territory, TerritoryLevel } from './entities/territory.entity';
import { Structure, StructureStatus, StructureType } from './entities/structure.entity';
import { MobileTeam } from './entities/mobile-team.entity';
import { User } from '../identity/entities/user.entity';
import { AuditService } from '../../common/audit/audit.service';
import { ScopeService } from '../../common/scope/scope.service';
import { RoleCode } from '../identity/entities/role.entity';

@Injectable()
export class OrgService {
  constructor(
    @InjectRepository(Territory) private territories: TreeRepository<Territory>,
    @InjectRepository(Structure) private structures: Repository<Structure>,
    @InjectRepository(MobileTeam) private teams: Repository<MobileTeam>,
    private audit: AuditService,
    private scope: ScopeService,
  ) {}

  // ---------- Territoires ----------

  async listTerritories(level?: TerritoryLevel) {
    const qb = this.territories.createQueryBuilder('t');
    if (level) qb.where('t.level = :level', { level });
    return qb.orderBy('t.name', 'ASC').getMany();
  }

  async createTerritory(dto: { level: TerritoryLevel; code: string; name: string; parentId?: string }) {
    if (dto.level !== TerritoryLevel.NATIONAL && !dto.parentId) {
      throw new BadRequestException('Un territoire régional/district requiert un parent');
    }
    const parent = dto.parentId ? await this.territories.findOne({ where: { id: dto.parentId } }) : null;
    if (dto.parentId && !parent) throw new NotFoundException('Territoire parent introuvable');
    // Cohérence des niveaux : régional → national ; district → régional
    if (parent) {
      const expected = dto.level === TerritoryLevel.REGIONAL ? TerritoryLevel.NATIONAL : TerritoryLevel.REGIONAL;
      if (parent.level !== expected) {
        throw new BadRequestException(`Le parent doit être de niveau ${expected}`);
      }
    }
    const t = this.territories.create({ ...dto, parent: parent ?? undefined } as any);
    return this.territories.save(t);
  }

  async updateTerritoryStatus(id: string, status: string) {
    await this.territories.update(id, { status });
    return this.territories.findOne({ where: { id } });
  }

  // ---------- Structures ----------

  async listStructures(actor: User, territoryId?: string, structureType?: StructureType) {
    const qb = this.structures.createQueryBuilder('s')
      .leftJoinAndSelect('s.territory', 't');
    if (actor.role?.code !== RoleCode.NATIONAL_ADMIN) {
      // Un non-admin ne voit que les structures de son périmètre.
      const sids = await this.scope.structureIdsFor(actor.id);
      const tids = await this.scope.territoryIdsFor(actor.id);
      qb.andWhere('(s.id IN (:...sids) OR s.territory_id IN (:...tids))', {
        sids: sids.length ? sids : ['00000000-0000-0000-0000-000000000000'],
        tids: tids.length ? tids : ['00000000-0000-0000-0000-000000000000'],
      });
    }
    if (territoryId) qb.andWhere('s.territory_id = :tid', { tid: territoryId });
    if (structureType) qb.andWhere('s.type = :tp', { tp: structureType });
    return qb.orderBy('s.name', 'ASC').getMany();
  }

  async createStructure(actor: User, dto: Partial<Structure>, ip?: string, ua?: string) {
    const territory = await this.territories.findOne({ where: { id: dto.territoryId } });
    if (!territory) throw new BadRequestException('Territoire invalide');
    const s = this.structures.create({ ...dto, territory });
    const saved = await this.structures.save(s);
    await this.audit.log({ actorId: actor.id, action: 'structure.create', resourceType: 'structure', resourceId: saved.id, ip, userAgent: ua });
    return saved;
  }

  async updateStructure(id: string, patch: Record<string, unknown>) {
    await this.structures.update(id, patch as any);
    const s = await this.structures.findOne({ where: { id }, relations: ['territory'] });
    if (!s) throw new NotFoundException('Structure introuvable');
    return s;
  }

  async setStructureStatus(id: string, status: StructureStatus) {
    return this.updateStructure(id, { status });
  }

  // ---------- Équipes mobiles ----------

  async listTeams(structureId?: string) {
    const qb = this.teams.createQueryBuilder('t')
      .leftJoinAndSelect('t.structure', 's')
      .leftJoinAndSelect('t.zoneTerritory', 'z');
    if (structureId) qb.where('t.structure_id = :sid', { sid: structureId });
    return qb.orderBy('t.name', 'ASC').getMany();
  }

  async createTeam(actor: User, dto: Partial<MobileTeam>, ip?: string, ua?: string) {
    if (dto.structureId) {
      const s = await this.structures.findOne({ where: { id: dto.structureId } });
      if (!s) throw new BadRequestException('Structure invalide');
    }
    const t = this.teams.create(dto);
    const saved = await this.teams.save(t);
    await this.audit.log({ actorId: actor.id, action: 'team.create', resourceType: 'mobile_team', resourceId: saved.id, ip, userAgent: ua });
    return saved;
  }

  async updateTeam(id: string, patch: Record<string, unknown>) {
    await this.teams.update(id, patch as any);
    const t = await this.teams.findOne({ where: { id } });
    if (!t) throw new NotFoundException('Équipe introuvable');
    return t;
  }
}
