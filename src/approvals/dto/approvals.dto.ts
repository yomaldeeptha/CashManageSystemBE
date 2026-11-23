import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class StageApproverInputDto {
  @Type(() => Number)
  @IsInt()
  userId!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxLimit!: number;
}

export class SaveApprovalStageDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  noOfApproval = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  noOfReject = 1;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StageApproverInputDto)
  users!: StageApproverInputDto[];
}

export class TemplateStageInputDto {
  @Type(() => Number)
  @IsInt()
  stageId!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  order!: number;
}

export class TemplateOriginatorInputDto {
  @Type(() => Number)
  @IsInt()
  userId!: number;
}

export class TemplateTermInputDto {
  @IsString()
  @IsNotEmpty()
  field!: string;

  @IsString()
  @IsNotEmpty()
  operator!: string;

  @IsString()
  value!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class SaveApprovalTemplateDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsObject()
  documents!: Record<string, boolean>;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateStageInputDto)
  stages!: TemplateStageInputDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateOriginatorInputDto)
  originators?: TemplateOriginatorInputDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateTermInputDto)
  terms?: TemplateTermInputDto[];
}

export class ApprovalDecisionDto {
  @IsIn(['approve', 'clarify', 'reject'])
  decision!: 'approve' | 'clarify' | 'reject';

  @IsOptional()
  @IsString()
  comment?: string;
}
