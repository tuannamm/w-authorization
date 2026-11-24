import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { AtLeastOneField, IsNonBlank, OptionalField } from './validators';

/** `:key` path parameter of /roles/{key}... */
export class RoleKeyParamDto {
  @IsString()
  @IsNonBlank()
  @MaxLength(50)
  declare key: string;
}

/** `:key` path parameter of /permissions/{key} */
export class PermissionKeyParamDto {
  @IsString()
  @IsNonBlank()
  @MaxLength(100)
  declare key: string;
}

export class CreateRoleDto {
  @IsString()
  @IsNonBlank()
  @MaxLength(50)
  declare key: string;
  @IsString()
  @IsNonBlank()
  @MaxLength(100)
  declare name: string;
  @OptionalField()
  @IsString()
  @IsNonBlank()
  @MaxLength(255)
  declare description?: string;
  @OptionalField()
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  declare permissionKeys?: string[];
}

export class UpdateRoleDto {
  @OptionalField()
  @IsString()
  @IsNonBlank()
  @MaxLength(100)
  declare name?: string;
  // '' is valid here: it clears the description (name stays non-blank).
  @OptionalField()
  @IsString()
  @MaxLength(255)
  declare description?: string;
  @AtLeastOneField(['name', 'description'])
  declare private readonly _atLeastOneField?: never;
}

/** Body of addPermissions / removePermissions: one array, so a UI can save a whole checkbox table. */
export class RolePermissionsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  declare permissionKeys: string[];
}

const integer = (value: unknown) =>
  typeof value === 'string' && value.length <= 10 && /^\d+$/.test(value)
    ? Number(value)
    : Number.NaN;

export class ListRoleUsersQueryDto {
  @Transform(({ value }) => (value === undefined ? 1 : integer(value)))
  @IsInt()
  @Min(1)
  page = 1;
  @Transform(({ value }) => (value === undefined ? 10 : integer(value)))
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 10;
}
