import { Entity, PrimaryGeneratedColumn, Column, ManyToMany } from 'typeorm';
import { Role } from './role.entity';

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string; // ex. dossier.read, acte.create, referentiel.validate

  @Column()
  resource: string;

  @Column()
  action: string; // read | create | update | validate | export | admin

  @ManyToMany(() => Role, (r) => r.permissions)
  roles: Role[];
}
