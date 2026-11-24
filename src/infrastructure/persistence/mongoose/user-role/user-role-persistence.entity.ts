import { Entity, Field } from '@lib-infrastructure/database';

export interface UserRoleRecord {
  userId: string;
  roleKey: string;
  assignedBy: string;
  assignedAt: Date;
}

@Entity({
  collection: 'user_roles',
  autoIndex: true,
  versionKey: false,
  bufferCommands: false,
})
export class UserRolePersistenceEntity implements UserRoleRecord {
  // Unique: a user holds exactly one role, and assignment is an upsert on it.
  @Field({ type: String, required: true, unique: true })
  userId!: string;

  // Indexed: counting and listing users by role must not scan the collection.
  @Field({ type: String, required: true, index: true })
  roleKey!: string;

  @Field({ type: String, required: true })
  assignedBy!: string;

  @Field({ type: Date, required: true })
  assignedAt!: Date;
}
