import { PersistenceMapper } from '@core/application/persistence-mapper.base';
import type { ToDomainParams, ToPersistenceParams } from '@core/application/persistence-mapper.base';
import { Identifier } from '@core/domain/identifier';
import type { Permission } from '@core/domain/permissions';
import { User } from '../../../../domain/entities/user.entity';
import { UserEmail } from '../../../../domain/value-objects/user-email.vo';
import { UserName } from '../../../../domain/value-objects/user-name.vo';
import { UserRole } from '../../../../domain/value-objects/user-role.vo';
import type { UserModel, UserModelData } from '../models/user.model';

export type UserToDomainParams = ToDomainParams<UserModel>;
export type UserToPersistenceParams = ToPersistenceParams<User>;

export class UserPersistenceMapper extends PersistenceMapper<User, UserModel, UserModelData> {
  public toDomain({ record }: UserToDomainParams): User {
    return User.reconstitute({
      props: {
        name: UserName.reconstitute(record.name),
        email: UserEmail.reconstitute(record.email),
        passwordHash: record.password_hash,
        access: UserRole.reconstitute({
          role: record.role as never,
          permissions: (record.permissions ?? []) as Permission[],
        }),
        isActive: record.is_active,
        lastLoginAt: record.last_login_at,
      },
      id: Identifier.fromExisting(record.id),
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    });
  }

  public toPersistence({ entity }: UserToPersistenceParams): UserModelData {
    return {
      id: entity.id.toString(),
      name: entity.name.value,
      email: entity.email.value,
      password_hash: entity.passwordHash,
      role: entity.role,
      permissions: entity.permissions,
      is_active: entity.isActive,
      last_login_at: entity.lastLoginAt,
      created_by: null,
      created_at: entity.createdAt,
      updated_at: entity.updatedAt,
    };
  }
}
