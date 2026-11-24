import { IsString, MaxLength } from 'class-validator';
import { IsNonBlank } from './validators';

export class UserIdParamDto {
  @IsString()
  @IsNonBlank()
  @MaxLength(128)
  declare id: string;
}

export class AssignRoleDto {
  @IsString()
  @IsNonBlank()
  @MaxLength(50)
  declare roleKey: string;
}
