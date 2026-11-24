import { Injectable } from '@nestjs/common';
import { MongoDBRepository } from '@lib-infrastructure/database';
import type { PermissionRepositoryPort } from '../../../../application/ports/permission-repository.port';
import type { Permission } from '../../../../domain/models/permission';
import {
  PermissionPersistenceEntity,
  type PermissionRecord,
} from './permission-persistence.entity';

@Injectable()
export class PermissionRepository
  extends MongoDBRepository<PermissionRecord>
  implements PermissionRepositoryPort
{
  readonly entity = PermissionPersistenceEntity;
  private toDomain(record: PermissionRecord): Permission {
    return { key: record.key, description: record.description };
  }
  async list(): Promise<Permission[]> {
    return (await this.find({}, { sort: { key: 1 } })).map((record) =>
      this.toDomain(record),
    );
  }
  async findByKey(key: string): Promise<Permission | null> {
    const record = await this.findOne({ key });
    return record ? this.toDomain(record) : null;
  }
  async sync(catalog: readonly Permission[]): Promise<string[]> {
    const keys = catalog.map((permission) => permission.key);
    return this.execute(async () => {
      const stale = await this.model
        .find({ key: { $nin: keys } }, { key: 1 })
        .lean<{ key: string }[]>()
        .exec();
      if (catalog.length)
        await this.model.bulkWrite(
          catalog.map((permission) => ({
            updateOne: {
              filter: { key: permission.key },
              update: { $set: { description: permission.description } },
              upsert: true,
            },
          })),
        );
      await this.model.deleteMany({ key: { $nin: keys } }).exec();
      return stale.map((record) => record.key);
    });
  }
}
