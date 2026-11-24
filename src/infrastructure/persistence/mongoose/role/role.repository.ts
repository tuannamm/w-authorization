import { Injectable } from '@nestjs/common';
import { MongoDBRepository } from '@lib-infrastructure/database';
import type {
  NewRole,
  RoleRepositoryPort,
} from '../../../../application/ports/role-repository.port';
import type { Role, RolePatch } from '../../../../domain/models/role';
import {
  RolePersistenceEntity,
  type RoleRecord,
} from './role-persistence.entity';
import { guardConflict } from '../persistence-guard';

@Injectable()
export class RoleRepository
  extends MongoDBRepository<RoleRecord>
  implements RoleRepositoryPort
{
  readonly entity = RolePersistenceEntity;
  private toDomain(record: RoleRecord): Role {
    return {
      key: record.key,
      name: record.name,
      description: record.description,
      kind: record.kind,
      permissionKeys: record.permissionKeys ?? [],
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }
  async insert(input: NewRole): Promise<Role> {
    const record = await guardConflict(
      () => this.create(input),
      'ROLE_CONFLICT',
      'Role already exists',
    );
    return this.toDomain(record);
  }
  async insertIfMissing(input: NewRole): Promise<boolean> {
    return this.execute(async () => {
      try {
        const result = await this.model
          .updateOne(
            { key: input.key },
            { $setOnInsert: input },
            { upsert: true },
          )
          .exec();
        return result.upsertedCount === 1;
      } catch (error) {
        // Another replica upserted the same key first: the role exists, which is the goal.
        if ((error as { code?: number }).code === 11000) return false;
        throw error;
      }
    });
  }
  async findByKey(key: string): Promise<Role | null> {
    const record = await this.findOne({ key });
    return record ? this.toDomain(record) : null;
  }
  async list(): Promise<Role[]> {
    return (await this.find({}, { sort: { key: 1 } })).map((record) =>
      this.toDomain(record),
    );
  }
  // Every mutation filters on `kind: { $ne: 'system' }`, so a race can never modify admin.
  private async mutate(
    key: string,
    update: Record<string, unknown>,
  ): Promise<Role | null> {
    const record = await this.execute(() =>
      this.model
        .findOneAndUpdate({ key, kind: { $ne: 'system' } }, update, {
          returnDocument: 'after',
          runValidators: true,
        })
        .lean<RoleRecord | null>()
        .exec(),
    );
    return record ? this.toDomain(record) : null;
  }
  update(key: string, patch: RolePatch): Promise<Role | null> {
    // An empty description clears the field instead of storing ''.
    const { description, ...rest } = patch;
    const set = { ...rest, ...(description ? { description } : {}) };
    return this.mutate(key, {
      ...(Object.keys(set).length ? { $set: set } : {}),
      ...(description === '' ? { $unset: { description: 1 } } : {}),
    });
  }
  addPermissions(key: string, permissionKeys: string[]): Promise<Role | null> {
    return this.mutate(key, {
      $addToSet: { permissionKeys: { $each: permissionKeys } },
    });
  }
  removePermissions(
    key: string,
    permissionKeys: string[],
  ): Promise<Role | null> {
    return this.mutate(key, {
      $pull: { permissionKeys: { $in: permissionKeys } },
    });
  }
  async delete(key: string): Promise<boolean> {
    return this.execute(
      async () =>
        (await this.model.deleteOne({ key, kind: 'custom' }).exec())
          .deletedCount === 1,
    );
  }
  async pullPermissionsEverywhere(permissionKeys: string[]): Promise<void> {
    if (!permissionKeys.length) return;
    await this.execute(async () => {
      await this.model
        .updateMany(
          { permissionKeys: { $in: permissionKeys } },
          { $pull: { permissionKeys: { $in: permissionKeys } } },
        )
        .exec();
    });
  }
}
