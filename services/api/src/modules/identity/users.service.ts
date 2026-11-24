import {
  Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { authenticator } from 'otplib';
import { User, UserStatus } from './entities/user.entity';
import { Role, RoleCode } from './entities/role.entity';
import { Assignment, AssignmentType } from './entities/assignment.entity';
import { CreateUserDto, UpdateUserStatusDto, AssignScopeDto } from './dto/users.dto';
import { AuditService } from '../../common/audit/audit.service';
import { AuditResult } from './entities/audit-log.entity';
import { ScopeService } from '../../common/scope/scope.service';

const CREATABLE_ROLES: RoleCode[] = [
  RoleCode.HEALTH_AUTHORITY, RoleCode.FACILITY_MANAGER, RoleCode.STOCK_MANAGER,
  RoleCode.VACCINATOR, RoleCode.CAMPAIGN_AGENT, RoleCode.MOBILE_TEAM_LEADER,
  RoleCode.BENEFICIARY, RoleCode.LEGAL_REPRESENTATIVE,
];

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(Role) private roles: Repository<Role>,
    @InjectRepository(Assignment) private assignments: Repository<Assignment>,
    private audit: AuditService,
    private scope: ScopeService,
  ) {}

  async findById(id: string) {
    return this.users.findOne({ where: { id }, relations: ['role', 'role.permissions'] });
  }

  async list(actor: User, filters: { structureId?: string; status?: UserStatus; roleCode?: RoleCode }) {
    const qb = this.users.createQueryBuilder('u')
      .leftJoinAndSelect('u.role', 'role')
      .leftJoinAndSelect('role.permissions', 'perm');

    // Un non-admin ne voit que les comptes de son périmètre.
    if (actor.role?.code !== RoleCode.NATIONAL_ADMIN) {
      const structureIds = await this.scope.structureIdsFor(actor.id);
      const territoryIds = await this.scope.territoryIdsFor(actor.id);
      if (structureIds.length === 0 && territoryIds.length === 0) {
        return { items: [], total: 0 };
      }
      qb.innerJoin(
        'assignments', 'asg',
        '(asg.structure_id IN (:...sids) OR asg.territory_id IN (:...tids)) AND asg.user_id = u.id',
        { sids: structureIds.length ? structureIds : ['00000000-0000-0000-0000-000000000000'], tids: territoryIds.length ? territoryIds : ['00000000-0000-0000-0000-000000000000'] },
      );
    }
    if (filters.structureId) qb.innerJoin('assignments', 'af', 'af.user_id = u.id AND af.structure_id = :sid', { sid: filters.structureId });
    if (filters.status) qb.andWhere('u.status = :st', { st: filters.status });
    if (filters.roleCode) qb.andWhere('role.code = :rc', { rc: filters.roleCode });

    const [items, total] = await qb.skip(0).take(200).getManyAndCount();
    return {
      total,
      items: items.map((u) => this.toDto(u)),
    };
  }

  /** Création contrôlée : rôle attribuable + périmètre du créateur vérifié. */
  async create(actor: User, dto: CreateUserDto, ip?: string, ua?: string) {
    const existing = await this.users.findOne({ where: [{ username: dto.username }, { email: dto.email ?? '' }] });
    if (existing) throw new ConflictException('Nom d’utilisateur ou email déjà utilisé');

    if (dto.roleCode === RoleCode.NATIONAL_ADMIN && actor.role?.code !== RoleCode.NATIONAL_ADMIN) {
      throw new ForbiddenException('Seul un administrateur national peut créer un compte admin');
    }
    if (!CREATABLE_ROLES.includes(dto.roleCode) && dto.roleCode !== RoleCode.NATIONAL_ADMIN) {
      throw new BadRequestException('Rôle non attribuable par ce processus');
    }

    const role = await this.roles.findOne({ where: { code: dto.roleCode }, relations: ['permissions'] });
    if (!role) throw new BadRequestException('Rôle inconnu');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = this.users.create({
      username: dto.username,
      passwordHash,
      email: dto.email,
      phone: dto.phone,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role,
      status: UserStatus.PENDING,
      createdBy: actor.id,
      mfaEnabled: [RoleCode.NATIONAL_ADMIN, RoleCode.HEALTH_AUTHORITY, RoleCode.FACILITY_MANAGER, RoleCode.STOCK_MANAGER].includes(dto.roleCode),
    });
    const saved = await this.users.save(user);

    if (dto.structureId || dto.territoryId) {
      await this.assignScope(actor, saved.id, {
        structureId: dto.structureId,
        territoryId: dto.territoryId,
        type: 'permanent',
        isPrimary: true,
      });
    }

    await this.audit.log({
      actorId: actor.id, action: 'account.create', resourceType: 'user', resourceId: saved.id,
      ip, userAgent: ua, details: { username: dto.username, role: dto.roleCode },
    });
    return this.toDto(saved);
  }

  async updateStatus(actor: User, userId: string, dto: UpdateUserStatusDto, ip?: string, ua?: string) {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    if (user.id === actor.id && dto.status !== UserStatus.ACTIVE) {
      throw new BadRequestException('Vous ne pouvez pas désactiver votre propre compte');
    }
    const old = user.status;
    user.status = dto.status;
    await this.users.save(user);
    await this.audit.log({
      actorId: actor.id, action: `account.${dto.status}`, resourceType: 'user', resourceId: userId,
      ip, userAgent: ua, details: { from: old, to: dto.status, reason: dto.reason },
    });
    return this.toDto(user);
  }

  async assignScope(actor: User, userId: string, dto: AssignScopeDto, ip?: string, ua?: string) {
    const target = await this.findById(userId);
    if (!target) throw new NotFoundException('Utilisateur introuvable');

    // Un non-admin ne peut affecter que dans son propre périmètre.
    if (actor.role?.code !== RoleCode.NATIONAL_ADMIN) {
      const sids = await this.scope.structureIdsFor(actor.id);
      const tids = await this.scope.territoryIdsFor(actor.id);
      const touchesStructure = dto.structureId && !sids.includes(dto.structureId);
      const touchesTerritory = dto.territoryId && !tids.includes(dto.territoryId);
      if (touchesStructure || touchesTerritory) {
        throw new ForbiddenException('Affectation hors de votre périmètre');
      }
    }
    if (!dto.structureId && !dto.teamId && !dto.territoryId) {
      throw new BadRequestException('Au moins un rattachement (structure/équipe/territoire) est requis');
    }

    const assignment = this.assignments.create({
      userId,
      structureId: dto.structureId,
      teamId: dto.teamId,
      territoryId: dto.territoryId,
      type: (dto.type as AssignmentType) ?? AssignmentType.PERMANENT,
      isPrimary: dto.isPrimary ?? false,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : new Date(),
      endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
      createdBy: actor.id,
    });
    const saved = await this.assignments.save(assignment);
    await this.audit.log({
      actorId: actor.id, action: 'assignment.create', resourceType: 'assignment', resourceId: saved.id,
      ip, userAgent: ua, details: { userId, ...dto },
    });
    return saved;
  }

  async listAssignments(userId: string) {
    return this.assignments.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  async setupMfa(userId: string) {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    const secret = authenticator.generateSecret();
    user.mfaSecret = secret;
    user.mfaEnabled = true;
    await this.users.save(user);
    return {
      secret,
      otpauth: authenticator.keyuri(user.username, 'ImmuniQ', secret),
    };
  }

  private toDto(u: User) {
    return {
      id: u.id,
      username: u.username,
      email: u.email,
      phone: u.phone,
      firstName: u.firstName,
      lastName: u.lastName,
      status: u.status,
      role: u.role?.code,
      permissions: u.role?.permissions?.map((p) => `${p.resource}.${p.action}`) ?? [],
      mfaEnabled: u.mfaEnabled,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
    };
  }
}
