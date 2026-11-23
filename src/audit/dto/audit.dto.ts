import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateAuditCommentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  entityType!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  entityId!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  docNo?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  comment!: string;
}

export class GenerateAuditExportDto {
  @ApiProperty({ enum: ['CSV', 'JSON'], default: 'CSV' })
  @IsIn(['CSV', 'JSON'])
  format: 'CSV' | 'JSON' = 'CSV';

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  companyId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  outletId?: string;
}
