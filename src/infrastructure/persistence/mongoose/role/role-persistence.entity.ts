import { Entity, Field } from '@lib-infrastructure/database';

export interface RoleRecord {
  key: string;
  name: string;
  description?: string;
  kind: 'system' | 'default' | 'custom';
  permissionKeys: string[];
  createdAt: Date;
  updatedAt: Date;
}

@Entity({
  collection: 'roles',
  autoIndex: true,
  timestamps: true,
  versionKey: false,
  bufferCommands: false,
})
export class RolePersistenceEntity implements RoleRecord {
  @Field({ type: String, required: true, unique: true })
  key!: string;

  @Field({ type: String, required: true })
  name!: string;

  @Field({ type: String })
  description?: string;

  @Field({
    type: String,
    enum: ['system', 'default', 'custom'],
    required: true,
  })
  kind!: 'system' | 'default' | 'custom';

  @Field({ type: [String], default: [] })
  permissionKeys!: string[];

  createdAt!: Date;
  updatedAt!: Date;
}
