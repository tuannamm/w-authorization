import { Injectable } from '@nestjs/common';
import { MongoDBRepository } from '@lib-infrastructure/database';
import type {
  UserRolePage,
  UserRoleRepositoryPort,
} from '../../../../application/ports/user-role-repository.port';
import type { UserRole } from '../../../../domain/models/user-role';
import {
  UserRolePersistenceEntity,
  type UserRoleRecord,
} from './user-role-persistence.entity';

@Injectable()
export class UserRoleRepository
  extends MongoDBRepository<UserRoleRecord>
  implements UserRoleRepositoryPort
{
  readonly entity = UserRolePersistenceEntity;
  private toDomain(record: UserRoleRecord): UserRole {
    return {
      userId: record.userId,
      roleKey: record.roleKey,
      assignedBy: record.assignedBy,
      assignedAt: record.assignedAt.toISOString(),
    };
  }
  async findByUserId(userId: string): Promise<UserRole | null> {
    const record = await this.findOne({ userId });
    return record ? this.toDomain(record) : null;
  }
  async assign(
    userId: string,
    roleKey: string,
    assignedBy: string,
  ): Promise<UserRole> {
    const filter = { userId };
    const update = { $set: { roleKey, assignedBy, assignedAt: new Date() } };
    const record = await this.execute(async () => {
      try {
        return await this.model
          .findOneAndUpdate(filter, update, {
            upsert: true,
            returnDocument: 'after',
            runValidators: true,
          })
          .lean<UserRoleRecord | null>()
          .exec();
      } catch (error) {
        // Two first-time assignments racing on the unique index: the loser just updates.
        if ((error as { code?: number }).code !== 11000) throw error;
        return this.model
          .findOneAndUpdate(filter, update, {
            returnDocument: 'after',
            runValidators: true,
          })
          .lean<UserRoleRecord | null>()
          .exec();
      }
    });
    if (!record) throw new Error('Missing user role');
    return this.toDomain(record);
  }
  countByRole(roleKey: string): Promise<number> {
    return this.count({ roleKey });
  }
  async countsByRole(): Promise<Record<string, number>> {
    const rows = await this.execute(() =>
      this.model
        .aggregate<{ _id: string; count: number }>([
          { $group: { _id: '$roleKey', count: { $sum: 1 } } },
        ])
        .exec(),
    );
    return Object.fromEntries(rows.map((row) => [row._id, row.count]));
  }
  async listByRole(
    roleKey: string,
    page: number,
    limit: number,
  ): Promise<UserRolePage> {
    const [records, total] = await Promise.all([
      this.find(
        { roleKey },
        { sort: { userId: 1 }, skip: (page - 1) * limit, limit },
      ),
      this.count({ roleKey }),
    ]);
    return { items: records.map((record) => this.toDomain(record)), total };
  }
}
