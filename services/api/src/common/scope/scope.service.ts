import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Assignment, AssignmentType } from '../../modules/identity/entities/assignment.entity';
import { User } from '../../modules/identity/entities/user.entity';

/**
 * Contrôle du périmètre organisationnel (IMQ-015/016).
 * Un utilisateur n'agit que sur les ressources de ses rattachements actifs.
 */
@Injectable()
export class ScopeService {
  constructor(
    @InjectRepository(Assignment)
    private readonly assignments: Repository<Assignment>,
  ) {}

  /** Affectations actives à date (non expirées, démarrées). */
  private activeScope() {
    const now = new Date();
    return this.assignments
      .createQueryBuilder('a')
      .where('a.starts_at <= :now', { now })
      .andWhere('(a.ends_at IS NULL OR a.ends_at > :now)', { now });
  }

  async structureIdsFor(userId: string): Promise<string[]> {
    const rows = await this.activeScope()
      .andWhere('a.user_id = :userId', { userId })
      .andWhere('a.structure_id IS NOT NULL')
      .getMany();
    return [...new Set(rows.map((r) => r.structureId))];
  }

  async territoryIdsFor(userId: string): Promise<string[]> {
    const rows = await this.activeScope()
      .andWhere('a.user_id = :userId', { userId })
      .andWhere('a.territory_id IS NOT NULL')
      .getMany();
    return [...new Set(rows.map((r) => r.territoryId))];
  }

  /** Vrai si l'utilisateur couvre la structure demandée (ou n'a aucune restriction). */
  async canAccessStructure(user: User, structureId: string): Promise<boolean> {
    if (user.role?.code === 'national_admin' || user.role?.code === 'health_authority') {
      // Les autorités voient leur niveau territorial : vérifié par territoryIdsFor côté appelant.
      if (user.role.code === 'national_admin') return true;
    }
    const ids = await this.structureIdsFor(user.id);
    return ids.includes(structureId);
  }

  /** Expire les affectations temporaires échues (à appeler par job planifié). */
  async expireTemporaryAssignments(): Promise<number> {
    const res = await this.assignments
      .createQueryBuilder()
      .delete()
      .where('type = :t AND ends_at <= :now', { t: AssignmentType.TEMPORARY, now: new Date() })
      .execute();
    return res.affected ?? 0;
  }
}
