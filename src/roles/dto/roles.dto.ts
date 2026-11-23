import { IsInt, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class SaveRoleDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  status?: number;
}

export class UpdateRolePermissionsDto {
  @IsObject()
  permissions!: Record<
    string,
    {
      read?: boolean;
      create?: boolean;
      update?: boolean;
      delete?: boolean;
      approve?: boolean;
      unblock?: boolean;
    }
  >;
}
