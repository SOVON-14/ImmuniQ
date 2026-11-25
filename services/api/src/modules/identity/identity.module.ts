import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Role, RoleCode } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { Session } from './entities/session.entity';
import { Device } from './entities/device.entity';
import { AuditLog } from './entities/audit-log.entity';
import { Assignment } from './entities/assignment.entity';
import { AuthService } from './auth.service';
import { UsersService } from './users.service';
import { AuthController } from './auth.controller';
import { UsersController } from './users.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AuditService } from '../../common/audit/audit.service';
import { ScopeService } from '../../common/scope/scope.service';
import { UserStatus } from './entities/user.entity';

const ENTITIES = [User, Role, Permission, Session, Device, AuditLog, Assignment];

@Module({
  imports: [
    TypeOrmModule.forFeature(ENTITIES),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'dev-only-secret-change-me',
      signOptions: { expiresIn: '15m' },
    }),
  ],
  controllers: [AuthController, UsersController],
  providers: [AuthService, UsersService, JwtStrategy, AuditService, ScopeService],
  exports: [AuthService, UsersService, AuditService, ScopeService],
})
export class IdentityModule implements OnModuleInit {
  constructor(
    @InjectRepository(Role) private roles: Repository<Role>,
    @InjectRepository(Permission) private permissions: Repository<Permission>,
    @InjectRepository(User) private users: Repository<User>,
  ) {}

  async onModuleInit() {
    if (process.env.NODE_ENV === 'production' && !process.env.SEED_DEMO) return;
    await this.seedRolesAndPermissions();
    await this.seedAdmin();
  }

  private async seedRolesAndPermissions() {
    const defs: Array<[RoleCode, string, string[], string]> = [
      [RoleCode.NATIONAL_ADMIN, 'Administrateur national',
        ['account.*', 'structure.*', 'territory.*', 'assignment.*', 'beneficiary.*', 'representative.*', 'merge.*', 'record.*', 'act.*', 'adverse_event.*', 'referential.*', 'campaign.*', 'stock.*', 'coldchain.*', 'temperature.*', 'incident.*', 'notification.*', 'preference.*', 'dashboard.*', 'report.*', 'export.*', 'settings.*', 'audit.*', 'backup.*', 'nomenclature.*', 'retention.*', 'sync.push', 'sync.pull'],
        'Accès transverse contrôlé, actions sensibles journalisées'],
      [RoleCode.HEALTH_AUTHORITY, 'Autorité sanitaire',
        ['account.read', 'account.create', 'account.suspend', 'account.validate', 'role.assign', 'structure.read', 'structure.create', 'structure.update', 'territory.read', 'assignment.manage', 'beneficiary.read', 'beneficiary.create', 'beneficiary.update', 'representative.manage', 'merge.approve', 'record.read', 'record.issue', 'act.read', 'referential.read', 'referential.draft', 'referential.submit', 'referential.approve', 'referential.publish', 'campaign.read', 'campaign.create', 'campaign.plan', 'stock.read', 'coldchain.read', 'incident.evaluate', 'notification.send', 'dashboard.read', 'report.read', 'export.create', 'audit.read', 'nomenclature.manage'],
        'Pilotage territorial et validation des référentiels'],
      [RoleCode.FACILITY_MANAGER, 'Responsable de structure',
        ['account.read', 'account.create', 'account.suspend', 'role.assign', 'session.revoke', 'structure.read', 'territory.read', 'assignment.manage', 'beneficiary.read', 'beneficiary.create', 'beneficiary.update', 'representative.manage', 'record.read', 'record.issue', 'act.read', 'campaign.read', 'campaign.create', 'campaign.plan', 'stock.read', 'stock.receive', 'stock.move', 'inventory.manage', 'coldchain.read', 'incident.manage', 'notification.read', 'notification.send', 'dashboard.read', 'report.read', 'export.create', 'sync.push', 'sync.pull'],
        'Gestion d’une structure : comptes, stocks, séances'],
      [RoleCode.STOCK_MANAGER, 'Gestionnaire de stock',
        ['stock.read', 'stock.receive', 'stock.move', 'stock.adjust', 'inventory.manage', 'coldchain.read', 'temperature.record', 'incident.manage', 'notification.read', 'report.read', 'structure.read', 'territory.read'],
        'Mouvements, lots, inventaires, chaîne du froid'],
      [RoleCode.VACCINATOR, 'Vaccinateur / professionnel de santé',
        ['beneficiary.read', 'beneficiary.create', 'beneficiary.update', 'record.read', 'record.issue', 'act.read', 'act.create', 'act.update', 'act.validate', 'adverse_event.declare', 'referential.read', 'campaign.read', 'stock.read', 'coldchain.read', 'notification.read', 'sync.push', 'sync.pull', 'structure.read', 'territory.read'],
        'Actes vaccinaux et dossiers dans son périmètre'],
      [RoleCode.CAMPAIGN_AGENT, 'Agent de campagne',
        ['beneficiary.read', 'beneficiary.create', 'beneficiary.update', 'record.read', 'record.issue', 'act.read', 'act.create', 'act.validate', 'adverse_event.declare', 'referential.read', 'campaign.read', 'stock.read', 'notification.read', 'sync.push', 'sync.pull', 'structure.read', 'territory.read'],
        'Activités de campagne et saisie terrain'],
      [RoleCode.MOBILE_TEAM_LEADER, 'Chef d’équipe mobile',
        ['account.read', 'assignment.manage', 'beneficiary.read', 'beneficiary.create', 'beneficiary.update', 'record.read', 'record.issue', 'act.read', 'act.create', 'act.update', 'act.validate', 'adverse_event.declare', 'referential.read', 'campaign.read', 'stock.read', 'coldchain.read', 'temperature.record', 'incident.manage', 'notification.read', 'dashboard.read', 'report.read', 'sync.push', 'sync.pull', 'structure.read', 'territory.read'],
        'Missions, affectations temporaires, synchronisation'],
      [RoleCode.BENEFICIARY, 'Bénéficiaire',
        ['record.read', 'notification.read', 'preference.manage'],
        'Son propre dossier, échéances, notifications'],
      [RoleCode.LEGAL_REPRESENTATIVE, 'Représentant légal',
        ['record.read', 'notification.read', 'preference.manage'],
        'Dossier(s) des bénéficiaires rattachés'],
    ];

    const permRepo = this.permissions;
    const allPerms = new Map<string, Permission>();
    for (const [, , codes] of defs) {
      for (const code of codes) {
        const [resource, action] = code.split('.');
        if (!allPerms.has(code)) {
          let p = await permRepo.findOne({ where: { code } });
          if (!p) p = await permRepo.save(permRepo.create({ code, resource, action }));
          allPerms.set(code, p);
        }
      }
    }
    // permissions wildcard national_admin : on stocke les codes littéraux "*"
    for (const [code, name, codes, desc] of defs) {
      let role = await this.roles.findOne({ where: { code }, relations: ['permissions'] });
      if (!role) role = this.roles.create({ code, name, description: desc });
      role.permissions = codes.map((c) => allPerms.get(c) ?? permRepo.create({ code: c, resource: c.split('.')[0], action: c.split('.')[1] ?? '*' }));
      await this.roles.save(role);
    }
  }

  private async seedAdmin() {
    const count = await this.users.count();
    if (count > 0) return;
    const adminRole = await this.roles.findOne({ where: { code: RoleCode.NATIONAL_ADMIN }, relations: ['permissions'] });
    const passwordHash = await bcrypt.hash(process.env.ADMIN_INITIAL_PASSWORD ?? 'ChangeMe!2026', 12);
    await this.users.save(this.users.create({
      username: process.env.ADMIN_USERNAME ?? 'admin',
      passwordHash,
      firstName: 'Admin',
      lastName: 'ImmuniQ',
      role: adminRole!,
      status: UserStatus.ACTIVE,
      mfaEnabled: false,
    }));
  }
}
