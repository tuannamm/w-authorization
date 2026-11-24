import { Entity, Field } from '@lib-infrastructure/database';

export interface PermissionRecord {
  key: string;
  description: string;
}

@Entity({
  collection: 'permissions',
  autoIndex: true,
  versionKey: false,
  bufferCommands: false,
})
export class PermissionPersistenceEntity implements PermissionRecord {
  @Field({ type: String, required: true, unique: true })
  key!: string;

  @Field({ type: String, required: true })
  description!: string;
}
