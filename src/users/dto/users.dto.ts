import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MenuAuthInputDto {
  @IsInt()
  menuId!: number;

  @IsInt()
  auth!: number;
}

export class CreateUserDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  userName!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  empNo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  designation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactNo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remark?: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  systemUserRoleId!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userGroupId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  employeeId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  status?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isConfirmEmail?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  navMenuMode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  docSectionMode?: string;

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray()
  selectedBusiness?: Array<number | string>;

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray()
  selectedBranch?: Array<number | string>;

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray()
  selectedOutlet?: Array<number | string>;

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray()
  selectedDepartment?: Array<number | string>;

  @ApiPropertyOptional({ type: [MenuAuthInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MenuAuthInputDto)
  authorization?: MenuAuthInputDto[];
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  empNo?: string;

  @IsOptional()
  @IsString()
  designation?: string;

  @IsOptional()
  @IsString()
  contactNo?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  remark?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  systemUserRoleId?: number;

  @IsOptional()
  @IsString()
  userGroupId?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  status?: number;

  @IsOptional()
  @IsBoolean()
  isConfirmEmail?: boolean;

  @IsOptional()
  @IsString()
  navMenuMode?: string;

  @IsOptional()
  @IsString()
  docSectionMode?: string;

  @IsOptional()
  @IsArray()
  selectedBusiness?: Array<number | string>;

  @IsOptional()
  @IsArray()
  selectedBranch?: Array<number | string>;

  @IsOptional()
  @IsArray()
  selectedOutlet?: Array<number | string>;

  @IsOptional()
  @IsArray()
  selectedDepartment?: Array<number | string>;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MenuAuthInputDto)
  authorization?: MenuAuthInputDto[];
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  contactNo?: string;

  @IsOptional()
  @IsString()
  designation?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  remark?: string;

  @IsOptional()
  @IsString()
  navMenuMode?: string;

  @IsOptional()
  @IsString()
  docSectionMode?: string;

  @IsOptional()
  @IsBoolean()
  twoFactorEnabled?: boolean;

  @IsOptional()
  @IsObject()
  preferences?: Record<string, unknown>;
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  @MinLength(6)
  newPassword!: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  requireChangeOnLogin?: boolean;
}

export class CreateUserGroupDto {
  @IsOptional()
  @IsString()
  userGroupId?: string;

  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @Type(() => Number)
  @IsInt()
  defaultRoleId!: number;

  @IsOptional()
  @IsString()
  defaultBadge?: string;

  @IsOptional()
  @IsBoolean()
  isAllFullAuth?: boolean;

  @IsOptional()
  @IsArray()
  defaultScreens?: Array<{
    screenId: string;
    authLevel: number;
    canAccess: boolean;
    canCreate: boolean;
    canEdit: boolean;
    canApprove: boolean;
    canExport: boolean;
  }>;
}
